// Proves that this phone's graphics chip gives the right face numbers.
//
// face-api.js runs on an old TensorFlow.js. On some phones (older iPhones especially) the
// graphics chip can return slightly wrong numbers without any error. Wrong numbers could make
// two different people look alike, and "a wrong name is worse than no name". So after the
// models load we describe one fixed test picture and compare the result with the numbers a
// desktop computer gave for the same picture. If they differ we switch to the slower but exact
// processor mode and check again. If that is wrong too, loading fails and the screen says so.

import * as faceapi from 'face-api.js';
import { FACE } from '../config';
import { euclideanDistance } from './match';
import { PROBE_EXPECTED } from './probeExpected';

const SIDE = 150; // the recognition network's own input size, so nothing is resized

/** The fixed test picture. Whole-number maths only, so every phone draws exactly the same pixels. */
function drawProbe(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIDE;
  canvas.height = SIDE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d canvas');
  const image = ctx.createImageData(SIDE, SIDE);
  const last = SIDE - 1;
  for (let y = 0; y < SIDE; y++) {
    for (let x = 0; x < SIDE; x++) {
      let r = Math.floor((x * 255) / last);
      let g = Math.floor((y * 255) / last);
      let b = Math.floor(((x + y) * 255) / (2 * last));
      // A darker round patch in the middle, so the picture is not only smooth slopes.
      const dx = x - 75;
      const dy = y - 75;
      if (dx * dx + dy * dy < 40 * 40) {
        r >>= 1;
        g >>= 1;
        b >>= 1;
      }
      const i = (y * SIDE + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** The 128 numbers this device gives for the test picture. */
export async function probeDescriptor(): Promise<Float32Array> {
  const found = await faceapi.computeFaceDescriptor(drawProbe());
  return Array.isArray(found) ? found[0] : found;
}

export interface FaceEngineInfo {
  /** 'webgl' = graphics chip (fast), 'cpu' = processor (slow, exact). */
  mode: string;
  /** How far this device's numbers were from the reference in that mode. */
  distance: number;
  /** The same for the graphics chip, when it was tried first and rejected. */
  rejectedDistance: number | null;
}

let info: FaceEngineInfo | null = null;

/** What the last self-check found. Shown as a small technical line in Settings for phone tests. */
export function getFaceEngineInfo(): FaceEngineInfo | null {
  return info;
}

/** Distance from the reference numbers, or NaN when this mode cannot even run. */
async function probeDistance(): Promise<number> {
  try {
    return euclideanDistance(await probeDescriptor(), PROBE_EXPECTED);
  } catch {
    return Number.NaN;
  }
}

function isRight(distance: number): boolean {
  return distance <= FACE.selfCheckMaxDistance; // NaN is "not right" too
}

/** Throws when this device cannot produce correct face numbers in any mode. */
export async function verifyFaceNumbers(): Promise<void> {
  const first = await probeDistance();
  if (isRight(first)) {
    info = { mode: faceapi.tf.getBackend(), distance: first, rejectedDistance: null };
    return;
  }
  // The graphics chip is not exact here (or crashed): use the processor instead (slower, exact).
  await faceapi.tf.setBackend('cpu');
  const second = await probeDistance();
  if (isRight(second)) {
    info = { mode: 'cpu', distance: second, rejectedDistance: first };
    return;
  }
  info = null;
  throw new Error('this device gives wrong face numbers');
}
