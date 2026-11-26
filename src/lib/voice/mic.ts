// Opening the microphone and mapping its errors. Browser only.

import type { DeviceError } from '../types';

/** The microphone could not be opened. `code` says why. */
export class MicError extends Error {
  code: DeviceError;

  constructor(code: DeviceError, message?: string) {
    super(message ?? `Microphone error: ${code}`);
    this.name = 'MicError';
    this.code = code;
  }
}

/** Same idea as the cameras: browser error name -> our small list of reasons. */
export function mapMicError(err: unknown): MicError {
  if (err instanceof MicError) return err;
  const name = err instanceof Error || (typeof err === 'object' && err !== null && 'name' in err)
    ? String((err as { name: unknown }).name)
    : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return new MicError('denied');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new MicError('notFound');
    case 'NotReadableError':
    case 'TrackStartError':
      return new MicError('inUse');
    default:
      return new MicError('unknown');
  }
}

/** Open an audio-only stream. The caller must stop its tracks (see stopStream). */
export async function openMic(): Promise<MediaStream> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new MicError('unsupported');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      video: false,
    });
  } catch (err) {
    throw mapMicError(err);
  }
}

/** Stop every track so the microphone light goes off. Safe to call twice. */
export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // already stopped
    }
  }
}
