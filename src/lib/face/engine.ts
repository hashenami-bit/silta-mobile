// Face engine: TinyFaceDetector -> 68 landmarks -> recognition net. Local model files only.

import * as faceapi from 'face-api.js';
import { FACE, MODELS_PATH } from '../config';
import type { FaceDescription, FaceEngine, FaceSource } from './api';
import { verifyFaceNumbers } from './selfCheck';

let engine: FaceEngine | null = null;

/** Draws a blank canvas and runs every network once, so the first real check is fast. */
async function warmUp(): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: FACE.detectorInputSize,
    scoreThreshold: FACE.detectorMinScore,
  });
  await faceapi.detectAllFaces(canvas, options);
  // A blank image has no face, so run the two later networks directly.
  await faceapi.nets.faceLandmark68Net.detectLandmarks(canvas);
  await faceapi.computeFaceDescriptor(canvas);
}

function createEngine(): FaceEngine {
  let loaded = false;
  let loading: Promise<void> | null = null;
  // Tail of the work queue: inferences run one after another, never at the same time.
  let queue: Promise<unknown> = Promise.resolve();
  // Built once, reused for every check.
  let options: faceapi.TinyFaceDetectorOptions | null = null;

  // Set by reset(): the model numbers in memory may be damaged, read the files again.
  let reloadFiles = false;

  async function doLoad(): Promise<void> {
    try {
      const nets = [
        faceapi.nets.tinyFaceDetector,
        faceapi.nets.faceLandmark68Net,
        faceapi.nets.faceRecognitionNet,
      ];
      await Promise.all(
        nets.map(async (net) => {
          if (reloadFiles && net.isLoaded) {
            try {
              net.dispose(false); // free the old copy before loading a new one
            } catch {
              // the graphics memory is already gone; nothing to free
            }
          }
          // A retry after a failed self-check keeps the copy it already has.
          if (!net.isLoaded) await net.loadFromUri(MODELS_PATH);
        }),
      );
      reloadFiles = false;
      try {
        await warmUp();
      } catch {
        // The graphics chip cannot run the models (or the phone took its memory away):
        // use the processor instead. Slower, but it works.
        await faceapi.tf.setBackend('cpu');
        await warmUp();
      }
      // Never name people with numbers this phone gets wrong (see selfCheck.ts).
      await verifyFaceNumbers();
      options = new faceapi.TinyFaceDetectorOptions({
        inputSize: FACE.detectorInputSize,
        scoreThreshold: FACE.detectorMinScore,
      });
      loaded = true;
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`Face models could not be loaded: ${detail}`);
    }
  }

  function load(): Promise<void> {
    if (loaded) return Promise.resolve();
    if (!loading) {
      loading = doLoad().catch((err: unknown) => {
        loading = null; // allow a later retry
        throw err;
      });
    }
    return loading;
  }

  async function run(source: FaceSource): Promise<FaceDescription | null> {
    await load();
    if (!options) return null;
    const results = await faceapi
      .detectAllFaces(source, options)
      .withFaceLandmarks()
      .withFaceDescriptors();

    let best: (typeof results)[number] | null = null;
    let bestArea = -1;
    for (const r of results) {
      const area = r.detection.box.width * r.detection.box.height;
      if (area > bestArea) {
        bestArea = area;
        best = r;
      }
    }
    if (!best) return null;
    const { x, y, width, height } = best.detection.box;
    return {
      descriptor: best.descriptor,
      box: { x, y, width, height },
      score: best.detection.score,
    };
  }

  function describe(source: FaceSource): Promise<FaceDescription | null> {
    const job = queue.then(() => run(source));
    queue = job.catch(() => undefined); // one failed job must not block the next
    return job;
  }

  function reset(): void {
    loaded = false;
    loading = null;
    reloadFiles = true;
  }

  return { load, isLoaded: () => loaded, describe, reset };
}

export function getFaceEngine(): FaceEngine {
  if (!engine) engine = createEngine();
  return engine;
}
