import { describe, expect, it } from 'vitest';
import { LOCK } from '../config';
import { checkPin, createPinLock, createTryGate, isValidPin } from './index';

describe('isValidPin', () => {
  it('accepts exactly the right number of digits', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('0000')).toBe(true);
  });

  it('rejects anything else', () => {
    for (const bad of ['', '123', '12345', '12a4', ' 123', '١٢٣٤']) expect(isValidPin(bad)).toBe(false);
  });
});

describe('createPinLock / checkPin', () => {
  it('accepts the right PIN and rejects a wrong one', async () => {
    const lock = await createPinLock('4821');
    expect(await checkPin('4821', lock)).toBe(true);
    expect(await checkPin('4822', lock)).toBe(false);
    expect(await checkPin('', lock)).toBe(false);
  });

  it('never keeps the PIN itself', async () => {
    const lock = await createPinLock('4821');
    expect(JSON.stringify(lock)).not.toContain('4821');
    expect(lock.iterations).toBe(LOCK.iterations);
  });

  it('gives a different record each time for the same PIN', async () => {
    const [a, b] = await Promise.all([createPinLock('4821'), createPinLock('4821')]);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('refuses to make a lock from a bad PIN', async () => {
    await expect(createPinLock('12')).rejects.toThrow();
  });
});

describe('createTryGate', () => {
  it('allows the first misses without a wait, then asks to wait', () => {
    const gate = createTryGate();
    for (let i = 0; i < LOCK.maxTries - 1; i++) {
      gate.miss(1000);
      expect(gate.waitMs(1000)).toBe(0);
    }
    gate.miss(1000);
    expect(gate.waitMs(1000)).toBe(LOCK.waitMs);
    expect(gate.waitMs(1000 + LOCK.waitMs)).toBe(0);
  });

  it('asks to wait again after every further miss', () => {
    const gate = createTryGate();
    for (let i = 0; i < LOCK.maxTries; i++) gate.miss(0);
    const later = LOCK.waitMs + 5;
    gate.miss(later);
    expect(gate.waitMs(later)).toBe(LOCK.waitMs);
  });

  it('starts again after a right PIN', () => {
    const gate = createTryGate();
    for (let i = 0; i < LOCK.maxTries; i++) gate.miss(0);
    gate.hit();
    expect(gate.waitMs(0)).toBe(0);
    gate.miss(0);
    expect(gate.waitMs(0)).toBe(0);
  });
});
