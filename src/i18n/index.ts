// Text lookup. Owned by the main session.
// uz.ts is the key list; ru.ts must have exactly the same keys.

import type { Kinship, KinshipKey, Lang } from '../lib/types';
import { ru } from './ru';
import { uz } from './uz';

export type TextKey = keyof typeof uz;
export type TextVars = Record<string, string | number>;

export const DEFAULT_LANG: Lang = 'uz';

export const KINSHIP_KEYS: KinshipKey[] = [
  'daughter',
  'son',
  'wife',
  'husband',
  'granddaughter',
  'grandson',
  'daughterInLaw',
  'sonInLaw',
  'olderSister',
  'youngerSister',
  'olderBrother',
  'youngerBrother',
  'niece',
  'nephew',
  'friend',
  'neighbour',
  'helper',
];

const TABLES: Record<Lang, Record<TextKey, string>> = { uz, ru };

/** Returns the text for a key, replacing {name}-style placeholders. */
export function translate(lang: Lang, key: TextKey, vars?: TextVars): string {
  const text = TABLES[lang][key] ?? TABLES[DEFAULT_LANG][key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** Short word for lists and pickers, e.g. "Qizi" / "Дочь". */
export function kinshipLabel(lang: Lang, kinship: Kinship): string {
  if (kinship.preset === null) return kinship.custom.trim();
  const key: TextKey = `kin.${kinship.preset}.label`;
  return translate(lang, key);
}

/** Words used inside a sentence said to the elder, e.g. "sizning qizingiz" / "ваша дочь". */
export function kinshipPhrase(lang: Lang, kinship: Kinship): string {
  if (kinship.preset === null) return kinship.custom.trim();
  const key: TextKey = `kin.${kinship.preset}.phrase`;
  return translate(lang, key);
}

/** The full warm sentence, e.g. "Bu sizning qizingiz — Dilnoza". */
export function introduce(lang: Lang, name: string, kinship: Kinship): string {
  const phrase = kinshipPhrase(lang, kinship);
  if (!phrase) return translate(lang, 'person.introduceNameOnly', { name });
  return translate(lang, 'person.introduce', { phrase, name });
}
