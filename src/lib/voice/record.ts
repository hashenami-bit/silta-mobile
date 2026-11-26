// recordVoiceSample: microphone -> raw samples -> voice print. Browser only.

import { VOICE } from '../config';
import type { RecordOptions, VoiceCapture } from './api';
import { voicePrintFromPcm } from './features';
import { openMic, stopStream } from './mic';
import { openPcmTap, type PcmTap } from './pcmTap';

/** How often the level meter is updated. */
const LEVEL_EVERY_MS = 100;

function chunkRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return samples.length > 0 ? Math.sqrt(sum / samples.length) : 0;
}

export async function recordVoiceSample(options: RecordOptions = {}): Promise<VoiceCapture | null> {
  const { signal, onLevel } = options;
  if (signal?.aborted) return null;

  const stream = await openMic(); // throws MicError
  let tap: PcmTap | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let onAbort: (() => void) | null = null;
  let onHidden: (() => void) | null = null;

  // One place that always lets go of the microphone.
  const release = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (onAbort) signal?.removeEventListener('abort', onAbort);
    if (onHidden) document.removeEventListener('visibilitychange', onHidden);
    tap?.close();
    tap = null;
    stopStream(stream);
  };

  try {
    if (signal?.aborted) return null;

    const chunks: Float32Array[] = [];
    let preRoll: Float32Array | null = null;
    let speaking = false;
    let recordedSamples = 0;
    let lastLevelAt = 0;
    let finish: (completed: boolean) => void = () => {};

    const done = new Promise<boolean>((resolve) => {
      finish = resolve;
    });

    onAbort = () => finish(false);
    signal?.addEventListener('abort', onAbort);
    // Never listen in the background: end as "nothing usable" (the microphone is released below).
    onHidden = () => {
      if (document.hidden) finish(false);
    };
    document.addEventListener('visibilitychange', onHidden);
    if (document.hidden) finish(false);
    timer = setTimeout(() => finish(speaking), VOICE.waitForSpeechMs);

    let rate = 0;
    const opening = openPcmTap(stream, (samples) => {
      const rms = chunkRms(samples);
      const now = Date.now();
      if (onLevel && now - lastLevelAt >= LEVEL_EVERY_MS) {
        lastLevelAt = now;
        onLevel(Math.min(1, rms));
      }
      if (!speaking) {
        if (rms > VOICE.speechRms) {
          speaking = true;
          if (preRoll) chunks.push(preRoll); // keep the start of the first word
          // Speech found: stop waiting, now collect for sampleMs.
          if (timer !== null) clearTimeout(timer);
          timer = setTimeout(() => finish(true), VOICE.sampleMs + 1000); // safety net
        } else {
          preRoll = samples;
          return;
        }
      }
      chunks.push(samples);
      recordedSamples += samples.length;
      if (rate > 0 && (recordedSamples / rate) * 1000 >= VOICE.sampleMs) finish(true);
    });
    // If stop/cancel/background comes while the tap is still opening, do not wait for it:
    // let go of the microphone now and close the tap when it arrives.
    const opened = await Promise.race([opening, done.then(() => null)]);
    if (!opened) {
      opening.then((late) => late.close(), () => {});
      release();
      return null;
    }
    tap = opened;
    rate = tap.sampleRate;
    if (signal?.aborted) finish(false);

    const completed = await done;
    // Let go of the microphone before the (short) calculation.
    release();
    if (!completed || signal?.aborted) return null;

    let total = 0;
    for (const c of chunks) total += c.length;
    const pcm = new Float32Array(total);
    let offset = 0;
    for (const c of chunks) {
      pcm.set(c, offset);
      offset += c.length;
    }
    return voicePrintFromPcm(pcm, rate);
  } finally {
    release();
  }
}
