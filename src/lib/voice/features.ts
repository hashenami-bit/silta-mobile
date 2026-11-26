// Voice print from raw audio. Pure code: no DOM, runs in Node and in the browser.
// Steps: resample to 16 kHz -> pre-emphasis -> frames -> keep speech frames ->
// MFCC per frame (Meyda) -> mean + standard deviation per coefficient.

import Meyda from 'meyda';
import { VOICE } from '../config';
import type { VoiceCapture } from './api';

/** Every recording is converted to this rate first, so phones with other rates give the same print. */
export const TARGET_RATE = 16000;
/** Frame buffer: 512 samples = 32 ms at 16 kHz (Meyda needs a power of two). */
const FRAME = 512;
/** Step between frames: 160 samples = 10 ms. */
const HOP = 160;
const HOP_MS = (HOP / TARGET_RATE) * 1000;
const PRE_EMPHASIS = 0.97;
const MEL_BANDS = 26;
/** MFCC 0 (overall loudness) is dropped, so we ask for 13 and keep 12. */
const MFCC_COUNT = 13;
/** Every speech frame is scaled to this loudness before the MFCC, so gain does not matter. */
const FRAME_LEVEL = 1000;
/** Size of the saved vector: 12 means + 12 standard deviations. */
export const VECTOR_LENGTH = (MFCC_COUNT - 1) * 2;

/** Convert to 16 kHz. Averaging while shrinking works as a simple low-pass filter. */
export function resampleTo16k(pcm: Float32Array, sampleRate: number): Float32Array {
  if (!(sampleRate > 0)) return new Float32Array(0);
  if (sampleRate === TARGET_RATE) return pcm;
  const ratio = sampleRate / TARGET_RATE;
  const outLen = Math.floor(pcm.length / ratio);
  const out = new Float32Array(outLen);
  if (ratio > 1) {
    for (let i = 0; i < outLen; i++) {
      const start = i * ratio;
      const end = start + ratio;
      let sum = 0;
      let weight = 0;
      for (let j = Math.floor(start); j < Math.ceil(end) && j < pcm.length; j++) {
        const w = Math.min(j + 1, end) - Math.max(j, start);
        sum += pcm[j] * w;
        weight += w;
      }
      out[i] = weight > 0 ? sum / weight : 0;
    }
  } else {
    for (let i = 0; i < outLen; i++) {
      const pos = i * ratio;
      const j = Math.floor(pos);
      const frac = pos - j;
      const a = pcm[j];
      const b = j + 1 < pcm.length ? pcm[j + 1] : a;
      out[i] = a + (b - a) * frac;
    }
  }
  return out;
}

/**
 * Build a voice print. Returns null when there is less than VOICE.minVoicedMs of speech.
 * The vector is [mean of MFCC 1..12, standard deviation of MFCC 1..12] over ALL speech frames.
 */
export function voicePrintFromPcm(pcm: Float32Array, sampleRate: number): VoiceCapture | null {
  const signal = resampleTo16k(pcm, sampleRate);
  if (signal.length < FRAME) return null;

  // Meyda keeps its settings on one shared object, so set them every time.
  Meyda.bufferSize = FRAME;
  Meyda.sampleRate = TARGET_RATE;
  Meyda.melBands = MEL_BANDS;
  Meyda.numberOfMFCCCoefficients = MFCC_COUNT;
  Meyda.windowingFunction = 'hanning';
  // Drop a cached filter bank built for another setting (Meyda only checks its length).
  (Meyda as unknown as { melFilterBank?: unknown }).melFilterBank = undefined;

  const frame = new Float32Array(FRAME);
  const coefs = MFCC_COUNT - 1;
  const sum = new Float64Array(coefs);
  const sumSq = new Float64Array(coefs);
  let voiced = 0;

  for (let start = 0; start + FRAME <= signal.length; start += HOP) {
    // Loudness is measured on the plain signal, before any filtering.
    let energy = 0;
    for (let i = 0; i < FRAME; i++) energy += signal[start + i] * signal[start + i];
    const rms = Math.sqrt(energy / FRAME);
    if (!(rms > VOICE.speechRms)) continue;

    // Pre-emphasis lifts high frequencies; level scaling removes loudness.
    const gain = FRAME_LEVEL / rms;
    let emphEnergy = 0;
    for (let i = 0; i < FRAME; i++) {
      const prev = start + i > 0 ? signal[start + i - 1] : 0;
      const v = signal[start + i] - PRE_EMPHASIS * prev;
      frame[i] = v;
      emphEnergy += v * v;
    }
    const emphRms = Math.sqrt(emphEnergy / FRAME);
    if (!(emphRms > 0)) continue;
    const scale = (gain * rms) / emphRms; // = FRAME_LEVEL / emphRms
    for (let i = 0; i < FRAME; i++) frame[i] *= scale;

    const mfcc = Meyda.extract(['mfcc'], frame)?.mfcc; // array form returns an object
    if (!mfcc || mfcc.length < MFCC_COUNT) continue;
    let ok = true;
    for (let k = 1; k < MFCC_COUNT; k++) if (!Number.isFinite(mfcc[k])) ok = false;
    if (!ok) continue;

    voiced++;
    for (let k = 0; k < coefs; k++) {
      const c = mfcc[k + 1];
      sum[k] += c;
      sumSq[k] += c * c;
    }
  }

  const voicedMs = voiced * HOP_MS;
  if (voiced === 0 || voicedMs < VOICE.minVoicedMs) return null;

  const vector = new Float32Array(VECTOR_LENGTH);
  for (let k = 0; k < coefs; k++) {
    const mean = sum[k] / voiced;
    const variance = Math.max(0, sumSq[k] / voiced - mean * mean);
    vector[k] = mean;
    vector[coefs + k] = Math.sqrt(variance);
  }
  return { vector, voicedMs };
}
