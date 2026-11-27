import { useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from '../../app/appContext';
import { introduce } from '../../i18n';
import { elderNotes, nextTurn, pickByTurn } from '../../lib/notes';
import type { Person } from '../../lib/types';
import { ElderVoiceNote } from '../voice/ElderVoiceNote';
import { Panel } from './Panel';
import { PersonAvatar } from './PersonAvatar';

export interface MatchCardProps {
  person: Person;
  actions?: ReactNode;
}

export function MatchCard({ person, actions }: MatchCardProps) {
  const { t, lang } = useApp();
  // A new number each time the card appears, so the memory shown below changes from time to time.
  const [turn] = useState(() => nextTurn(person.id));
  const whoLine = person.whoLine.trim();
  // Only notes marked "show to elder" can get here.
  const note = pickByTurn(elderNotes(person), turn);
  return (
    <div
      aria-live="polite"
      className="mx-auto w-full max-w-md animate-rise-in rounded-card bg-surface p-5 text-center shadow-lift"
    >
      <div className="flex justify-center">
        <PersonAvatar person={person} size="card" className="ring-4 ring-lantern" />
      </div>
      <p className="mt-4 font-display text-hero text-ink">{person.name}</p>
      <p className="mt-1 text-lead text-ink-soft">{introduce(lang, person.name, person.kinship)}</p>
      {whoLine ? <p className="mt-3 break-words text-lead text-ink">{whoLine}</p> : null}
      {note ? (
        <Panel tone="lantern" title={t('match.noteTitle')} className="mt-4">
          <span className="whitespace-pre-wrap break-words">{note.text}</span>
        </Panel>
      ) : null}
      <ElderVoiceNote key={person.id} personId={person.id} turn={turn} />
      {actions ? <div className="mt-6 space-y-3">{actions}</div> : null}
    </div>
  );
}
