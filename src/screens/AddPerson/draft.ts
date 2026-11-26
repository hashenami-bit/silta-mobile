import type { KinshipKey, Kinship, Person, PersonPhoto, VoiceSample } from '../../lib/types';

export type KinChoice = KinshipKey | 'other' | null;

/** Everything the caregiver fills in while the wizard is open. */
export interface Draft {
  caregiverName: string;
  agreedCaregiver: boolean;
  agreedPerson: boolean;
  name: string;
  kinChoice: KinChoice;
  kinCustom: string;
  notes: string;
  photos: PersonPhoto[];
  voiceSamples: VoiceSample[];
}

export type DraftUpdater = (patch: Partial<Draft>) => void;
export type ListUpdater<T> = (update: (prev: T[]) => T[]) => void;

export function draftFromPerson(person: Person): Draft {
  const { preset, custom } = person.kinship;
  return {
    caregiverName: person.consent.caregiverName,
    agreedCaregiver: true,
    agreedPerson: person.consent.personAgreed,
    name: person.name,
    kinChoice: preset ?? (custom.trim() ? 'other' : null),
    kinCustom: custom,
    notes: person.notes,
    photos: person.photos,
    voiceSamples: person.voiceSamples,
  };
}

export function emptyDraft(caregiverName: string): Draft {
  return {
    caregiverName,
    agreedCaregiver: false,
    agreedPerson: false,
    name: '',
    kinChoice: null,
    kinCustom: '',
    notes: '',
    photos: [],
    voiceSamples: [],
  };
}

export function kinshipOf(draft: Draft): Kinship {
  if (draft.kinChoice === 'other') return { preset: null, custom: draft.kinCustom.trim() };
  if (draft.kinChoice) return { preset: draft.kinChoice, custom: '' };
  return { preset: null, custom: '' };
}

export function latestCaregiverName(people: Person[]): string {
  let best: Person | null = null;
  for (const p of people) if (!best || p.createdAt > best.createdAt) best = p;
  return best?.consent.caregiverName ?? '';
}
