// Pure helper: turns a getUserMedia failure into a DeviceError. No DOM needed.

import type { DeviceError } from '../types';

export function mapCameraError(err: unknown): DeviceError {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String(err.name) : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'notFound';
    case 'NotReadableError':
    case 'AbortError':
      return 'inUse';
    default:
      return 'unknown';
  }
}
