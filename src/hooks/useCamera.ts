import { useState, useRef, useEffect } from 'react';
import type { CameraMode } from '../types';
import { showToast } from '../utils/toast';

type FacingMode = 'user' | 'environment';

export const useCamera = () => {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, cameraMode]);

  const startCamera = async (mode: CameraMode, facing: FacingMode = 'user') => {
    try {
      // Stop existing stream if any
      if (cameraStream) {
        cameraStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setCameraStream(stream);
      setCameraMode(mode);
      setFacingMode(facing);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      showToast('Unable to access camera.', 'error');
    }
  };

  const switchCamera = async () => {
    if (!cameraMode) return;
    
    const newFacingMode: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(cameraMode, newFacingMode);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setCameraStream(null);
      setCameraMode(null);
      setFacingMode('user');
    }
  };

  return {
    cameraStream,
    cameraMode,
    facingMode,
    videoRef,
    startCamera,
    stopCamera,
    switchCamera,
  };
};

