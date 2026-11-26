// Camera contract. Owned by the main session.
// src/lib/camera/index.ts must export:  export function useCamera(): CameraControls

import type { RefObject } from 'react';
import type { DeviceError } from '../types';

export type Facing = 'user' | 'environment';

export type CameraState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'ready'; facing: Facing }
  | { status: 'error'; error: DeviceError };

export interface CameraControls {
  state: CameraState;
  /** Attach to a <video autoPlay playsInline muted>. Mirror it in CSS only when facing === 'user'. */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Never throws: failures end in state { status: 'error' }. */
  start(facing: Facing): Promise<void>;
  stop(): void;
  switchFacing(): Promise<void>;
}

// The hook must stop the camera when the component using it unmounts.
