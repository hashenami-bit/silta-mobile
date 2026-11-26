// startVoiceNote: records a voice note with MediaRecorder. Browser only.

import { VOICE } from '../config';
import type { NoteOptions, NoteRecorder, RecordedNote } from './api';
import { MicError, openMic, stopStream } from './mic';

const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

// A note is only useful if the same device can play it back. iOS 18.4+ can record WebM
// but older iPhones cannot play it, so check both.
function canPlay(type: string): boolean {
  if (typeof Audio === 'undefined') return true; // cannot check here: trust the recorder
  try {
    return new Audio().canPlayType(type) !== '';
  } catch {
    return true;
  }
}

function pickMimeType(): string | undefined {
  for (const type of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type) && canPlay(type)) return type;
  }
  return undefined; // let the browser choose
}

export async function startVoiceNote(options: NoteOptions = {}): Promise<NoteRecorder> {
  if (typeof MediaRecorder === 'undefined') throw new MicError('unsupported');
  const stream = await openMic(); // throws MicError

  let recorder: MediaRecorder;
  try {
    const mimeType = pickMimeType();
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch {
    stopStream(stream);
    throw new MicError('unsupported');
  }

  const parts: Blob[] = [];
  const startedAt = Date.now();
  let endedAt = 0;
  let cancelled = false;
  let askedByOwner = false; // stop() or cancel() was called, so the owner already knows
  let timer: ReturnType<typeof setTimeout> | null = null;

  let fail: (reason: Error) => void = () => {};
  const onHidden = () => {
    if (document.hidden) requestStop();
  };

  const release = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    document.removeEventListener('visibilitychange', onHidden);
    stopStream(stream);
  };

  const result = new Promise<RecordedNote>((resolve, reject) => {
    fail = reject;
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) parts.push(event.data);
    };
    recorder.onerror = () => {
      release();
      reject(new Error('recording failed'));
      if (!askedByOwner) options.onEnd?.();
    };
    recorder.onstop = () => {
      release();
      if (cancelled) {
        reject(new Error('cancelled'));
        return;
      }
      // Ended on its own (app in background, time limit, microphone lost): tell the owner.
      if (!askedByOwner) queueMicrotask(() => options.onEnd?.());
      if (endedAt === 0) endedAt = Date.now(); // stopped by itself (e.g. microphone unplugged)
      const mimeType = recorder.mimeType || parts[0]?.type || 'audio/webm';
      new Blob(parts, { type: mimeType })
        .arrayBuffer()
        .then((audio) => resolve({ audio, mimeType, durationMs: endedAt - startedAt }), reject);
    };
  });
  result.catch(() => {}); // a cancelled note is not an error nobody handled

  const requestStop = () => {
    if (endedAt === 0) endedAt = Date.now();
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        release();
        fail(new Error('recording failed'));
      }
    }
  };

  try {
    recorder.start();
  } catch {
    release();
    throw new MicError('unknown');
  }
  timer = setTimeout(requestStop, VOICE.noteMaxMs); // stop() still returns the audio afterwards
  // Never keep recording after the app is sent to the background.
  document.addEventListener('visibilitychange', onHidden);
  onHidden(); // already in the background: stop straight away

  return {
    stop: () => {
      askedByOwner = true;
      requestStop();
      return result;
    },
    cancel: () => {
      cancelled = true;
      askedByOwner = true;
      requestStop();
      release(); // let go of the microphone right now
    },
  };
}
