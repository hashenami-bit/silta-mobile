// Caregiver PIN. The PIN itself is never saved: only a scrambled form that cannot be turned back into digits.
// This is a gentle lock that keeps the elder out of the caregiver area, not protection against
// someone who takes the phone apart: a 4-digit PIN has only 10 000 possibilities.

import { LOCK } from '../config';
import type { PinLock } from '../types';

export function isValidPin(pin: string): boolean {
  return pin.length === LOCK.pinLength && /^\d+$/.test(pin);
}

function toBase64(bytes: Uint8Array): string {
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text);
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function scramble(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toBase64(new Uint8Array(bits));
}

/** Makes the record that is saved in settings. Throws when the PIN is not LOCK.pinLength digits. */
export async function createPinLock(pin: string): Promise<PinLock> {
  if (!isValidPin(pin)) throw new Error('invalid pin');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toBase64(salt), hash: await scramble(pin, salt, LOCK.iterations), iterations: LOCK.iterations };
}

/** True when the PIN is the one the lock was made with. */
export async function checkPin(pin: string, lock: PinLock): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const hash = await scramble(pin, fromBase64(lock.salt), lock.iterations);
  // Compare every character, so the time taken says nothing about where the first difference is.
  let diff = hash.length ^ lock.hash.length;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ (lock.hash.charCodeAt(i) || 0);
  return diff === 0;
}

/** Slows down guessing: after LOCK.maxTries misses in a row, every further miss means a wait. */
export interface TryGate {
  /** Milliseconds until the next try is allowed (0 = now). */
  waitMs(now: number): number;
  miss(now: number): void;
  hit(): void;
}

export function createTryGate(): TryGate {
  let misses = 0;
  let blockedUntil = 0;
  return {
    waitMs: (now) => Math.max(0, blockedUntil - now),
    miss(now) {
      misses += 1;
      if (misses >= LOCK.maxTries) blockedUntil = now + LOCK.waitMs;
    },
    hit() {
      misses = 0;
      blockedUntil = 0;
    },
  };
}
