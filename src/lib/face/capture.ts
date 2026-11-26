// Takes one still picture from a video. Not mirrored.

import { FACE } from '../config';

let canvas: HTMLCanvasElement | null = null;

export function capturePhoto(video: HTMLVideoElement): string {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error('The camera picture is not ready yet.');

  const scale = Math.min(1, FACE.photoMaxSidePx / Math.max(w, h));
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));

  // Reuse one canvas; toDataURL copies the pixels out, so sharing is safe.
  if (!canvas) canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('A picture could not be taken.');
  ctx.drawImage(video, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', FACE.photoJpegQuality);
  // Do not keep the last picture in memory.
  canvas.width = 0;
  canvas.height = 0;
  return dataUrl;
}
