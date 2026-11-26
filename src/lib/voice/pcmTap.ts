// Reads raw audio samples from a microphone stream. Browser only.
// Uses an AudioWorklet (module built from an inline Blob) and falls back to
// ScriptProcessorNode when the worklet is missing or fails to load.

import { MicError } from './mic';

export interface PcmTap {
  /** Sample rate of the chunks (the audio context rate, e.g. 44100 or 48000). */
  sampleRate: number;
  /** Disconnect everything and close the audio context. Safe to call twice. */
  close(): void;
}

const CHUNK = 2048;

const WORKLET_SOURCE = `
class SiltaTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buf = new Float32Array(${CHUNK});
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) {
          this.port.postMessage(this.buf, [this.buf.buffer]);
          this.buf = new Float32Array(${CHUNK});
          this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('silta-tap', SiltaTap);
`;

/** How long to wait for iPhone calls that can stay pending forever (resume, addModule). */
const WAIT_MS = 1500;

/** Resolves with the promise's value, or with `fallback` after WAIT_MS. Never hangs. */
function raceWithTimeout<T, F>(promise: Promise<T>, fallback: F): Promise<T | F> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallback), WAIT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Start sending chunks of mono samples to onChunk. Throws MicError('unsupported') without Web Audio. */
export async function openPcmTap(
  stream: MediaStream,
  onChunk: (samples: Float32Array) => void,
): Promise<PcmTap> {
  const Ctor = getAudioContextCtor();
  if (!Ctor) throw new MicError('unsupported');

  const ctx = new Ctor();
  let closed = false;
  const nodes: AudioNode[] = [];
  let blobUrl: string | null = null;

  const close = () => {
    if (closed) return;
    closed = true;
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch {
        // already disconnected
      }
    }
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    ctx.close().catch(() => {});
  };

  try {
    // iPhone also has the non-standard state 'interrupted'; treat it like 'suspended'.
    const stateNow = () => ctx.state as string;
    if (stateNow() === 'suspended' || stateNow() === 'interrupted') {
      // iPhone can leave resume() waiting forever when it was not started by a tap: never hang on it.
      await raceWithTimeout(ctx.resume().catch(() => null), null);
    }
    // Still not running: the samples would be silence. Say "device problem" (a tap lets the person
    // try again and iOS then allows audio) instead of later claiming nothing was heard.
    if (stateNow() !== 'running') throw new MicError('unknown');

    const source = ctx.createMediaStreamSource(stream);
    // Silent output: some browsers only run a node that is connected to the speakers.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    mute.connect(ctx.destination);
    nodes.push(source, mute);

    let started = false;
    if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      try {
        blobUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
        // addModule can stay pending on iPhone (capacitor:// scheme). If it is late we use the
        // fallback below, and since the node is only created after this line, a late finish
        // cannot add a second one.
        const loading = ctx.audioWorklet.addModule(blobUrl);
        loading.catch(() => {}); // a failure after the timeout is not an unhandled error
        const loaded = await raceWithTimeout(loading.then(() => true), false);
        if (!loaded) throw new Error('worklet did not load');
        const node = new AudioWorkletNode(ctx, 'silta-tap', { numberOfInputs: 1, numberOfOutputs: 1 });
        node.port.onmessage = (event: MessageEvent<Float32Array>) => {
          if (!closed) onChunk(event.data);
        };
        source.connect(node);
        node.connect(mute);
        nodes.push(node);
        started = true;
      } catch {
        started = false; // fall back below
      }
    }

    if (!started) {
      const node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!closed) onChunk(new Float32Array(event.inputBuffer.getChannelData(0)));
      };
      source.connect(node);
      node.connect(mute);
      nodes.push(node);
    }
  } catch (err) {
    close();
    throw err instanceof MicError ? err : new MicError('unsupported');
  }

  return { sampleRate: ctx.sampleRate, close };
}
