import { describe, expect, it } from 'vitest';
import type { Kinship, Lang } from '../lib/types';
import { KINSHIP_KEYS, introduce, kinshipLabel, kinshipPhrase, translate } from './index';
import type { TextKey } from './index';
import { ru } from './ru';
import { uz } from './uz';

const TABLES: Record<Lang, Record<string, string>> = { uz, ru };
const LANGS: Lang[] = ['uz', 'ru'];
const keysOf = (t: Record<string, string>) => Object.keys(t).sort();
const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

describe('translation tables', () => {
  it('uz and ru have exactly the same keys', () => {
    const u = keysOf(uz);
    const r = keysOf(ru);
    expect(u.filter((k) => !r.includes(k))).toEqual([]);
    expect(r.filter((k) => !u.includes(k))).toEqual([]);
  });

  it.each(LANGS)('%s has no empty strings', (lang) => {
    const empty = Object.entries(TABLES[lang]).filter(([, v]) => v.trim() === '');
    expect(empty).toEqual([]);
  });

  it('placeholders match between uz and ru for every key', () => {
    const bad = Object.keys(uz).filter(
      (k) => JSON.stringify(placeholders(uz[k as TextKey])) !== JSON.stringify(placeholders(ru[k as TextKey])),
    );
    expect(bad).toEqual([]);
  });

  it.each(LANGS)('%s has no "%%" sign or technical words in visible text', (lang) => {
    const bad = Object.entries(TABLES[lang]).filter(([, v]) =>
      /%|face\s*id|descriptor|embedding/i.test(v),
    );
    expect(bad).toEqual([]);
  });

  it('protected Uzbek sentences are exact', () => {
    expect(uz['recognize.unsure']).toBe("Kimligini aniqlay olmadim — keling, birga ko'ramiz");
    expect(uz['privacy.short']).toBe(
      'Barcha rasmlar faqat telefoningizda saqlanadi — internetga yuklanmaydi.',
    );
  });
});

describe('translate', () => {
  it('replaces placeholders, including numbers', () => {
    expect(translate('uz', 'album.progress', { current: 2, total: 5 })).toBe('2 / 5');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(translate('uz', 'album.progress', { current: 2 })).toBe('2 / {total}');
    expect(translate('uz', 'album.progress')).toBe('{current} / {total}');
  });

  it('returns plain text unchanged', () => {
    expect(translate('ru', 'common.back')).toBe(ru['common.back']);
  });
});

describe('kinship text', () => {
  it.each(LANGS)('has a label and a phrase for every preset in %s', (lang) => {
    for (const preset of KINSHIP_KEYS) {
      const k: Kinship = { preset, custom: '' };
      expect(kinshipLabel(lang, k).trim()).not.toBe('');
      expect(kinshipPhrase(lang, k).trim()).not.toBe('');
      expect(kinshipLabel(lang, k)).not.toMatch(/^kin\./);
      expect(kinshipPhrase(lang, k)).not.toMatch(/^kin\./);
    }
  });

  it.each(LANGS)('returns trimmed custom text when preset is null (%s)', (lang) => {
    const k: Kinship = { preset: null, custom: '  amakisi  ' };
    expect(kinshipLabel(lang, k)).toBe('amakisi');
    expect(kinshipPhrase(lang, k)).toBe('amakisi');
  });
});

describe('introduce', () => {
  it('builds the full sentence with a preset', () => {
    const k: Kinship = { preset: 'daughter', custom: '' };
    expect(introduce('uz', 'Dilnoza', k)).toBe('Bu sizning qizingiz — Dilnoza');
  });

  it.each(LANGS)('uses the name-only sentence when the phrase is empty (%s)', (lang) => {
    const k: Kinship = { preset: null, custom: '   ' };
    const out = introduce(lang, 'Dilnoza', k);
    expect(out).toBe(translate(lang, 'person.introduceNameOnly', { name: 'Dilnoza' }));
    expect(out).toContain('Dilnoza');
  });

  it('uses the custom text in the sentence', () => {
    const out = introduce('uz', 'Anvar', { preset: null, custom: ' amakisi ' });
    expect(out).toBe('Bu amakisi — Anvar');
  });
});
