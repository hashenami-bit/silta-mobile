import { useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';

export const useModels = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadModels = useCallback(async () => {
    setError(null);
    setIsRetrying(true);
    const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load AI models: ${message}`);
    } finally {
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return { modelsLoaded, error, isRetrying, retry: loadModels };
};
