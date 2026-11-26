import { useEffect, useRef, useState } from 'react';
import type { CameraControls, CameraState, Facing } from './api';
import { mapCameraError } from './errors';

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

async function openStream(facing: Facing): Promise<MediaStream> {
  const base = { width: { ideal: 640 }, height: { ideal: 480 } };
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { ...base, facingMode: { ideal: facing } },
      audio: false,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'OverconstrainedError') {
      // Retry once without the facing preference.
      return navigator.mediaDevices.getUserMedia({ video: base, audio: false });
    }
    throw err;
  }
}

export function useCamera(): CameraControls {
  const [state, setState] = useState<CameraState>({ status: 'idle' });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingRef = useRef<Facing>('user');
  // Bumped on every start/stop. An older start that finishes late sees a new number and cleans up.
  const requestRef = useRef(0);

  function attach() {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.srcObject === stream) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      // autoPlay will start it; a blocked play() is not an error for the user.
    });
  }

  // If the <video> mounted after the camera became ready, attach it now.
  useEffect(() => {
    if (state.status === 'ready') attach();
  });

  // The facing the person asked for while the camera is meant to be on (null = not wanted).
  const wantedRef = useRef<Facing | null>(null);
  // True while the camera was switched off only because the app went to the background.
  const pausedRef = useRef(false);
  // Always points at the latest start(), so the visibility handler below never uses an old copy.
  const startRef = useRef<(facing: Facing) => Promise<void>>(async () => {});

  // Stop everything when the screen using the hook goes away.
  useEffect(() => {
    return () => {
      requestRef.current += 1;
      wantedRef.current = null;
      pausedRef.current = false;
      stopStream(streamRef.current);
      streamRef.current = null; // the <video> element is removed with the screen
    };
  }, []);

  function release() {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  // Never keep the camera on in the background. When the person comes back (for example after the
  // phone auto-locked) the camera starts again by itself. Being in the background is not an error.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (wantedRef.current === null) return;
        requestRef.current += 1; // a start that is still waiting must not keep its stream
        stopStream(streamRef.current);
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        pausedRef.current = true;
        setState({ status: 'starting' });
      } else if (pausedRef.current) {
        pausedRef.current = false;
        const facing = wantedRef.current;
        if (facing !== null) void startRef.current(facing);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Keep the screen awake while the camera is showing, so the phone does not lock mid-look.
  useEffect(() => {
    if (state.status !== 'ready') return;
    let cancelled = false;
    let lock: WakeLockSentinel | null = null;
    try {
      const request = navigator.wakeLock?.request('screen');
      request
        ?.then((sentinel) => {
          if (cancelled) void sentinel.release().catch(() => {});
          else lock = sentinel;
        })
        .catch(() => {
          // Not allowed right now (e.g. low battery): the phone may lock, nothing else breaks.
        });
    } catch {
      // wake lock not usable here
    }
    return () => {
      cancelled = true;
      void lock?.release().catch(() => {});
    };
  }, [state.status]);

  async function start(facing: Facing): Promise<void> {
    const id = ++requestRef.current;
    release();
    facingRef.current = facing;
    wantedRef.current = facing;
    pausedRef.current = false;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      wantedRef.current = null;
      setState({ status: 'error', error: 'unsupported' });
      return;
    }
    setState({ status: 'starting' });

    // Asked to start while the app is in the background (e.g. the person switched apps while
    // the face models were loading): wait. The visibility handler starts it when they come back.
    if (typeof document !== 'undefined' && document.hidden) {
      pausedRef.current = true;
      return;
    }

    let stream: MediaStream;
    try {
      stream = await openStream(facing);
    } catch (err) {
      if (id === requestRef.current) {
        wantedRef.current = null;
        setState({ status: 'error', error: mapCameraError(err) });
      }
      return;
    }

    if (id !== requestRef.current) {
      // stop() or a newer start() happened while we waited: do not leave this stream running.
      stopStream(stream);
      return;
    }
    streamRef.current = stream;
    attach();
    setState({ status: 'ready', facing });
  }

  useEffect(() => {
    startRef.current = start;
  });

  function stop() {
    requestRef.current += 1;
    wantedRef.current = null;
    pausedRef.current = false;
    release();
    setState({ status: 'idle' });
  }

  async function switchFacing(): Promise<void> {
    await start(facingRef.current === 'user' ? 'environment' : 'user');
  }

  return { state, videoRef, start, stop, switchFacing };
}
