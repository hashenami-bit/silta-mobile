import type { ReactNode } from 'react';
import { useApp } from '../../app/appContext';
import { introduce } from '../../i18n';
import type { Person } from '../../lib/types';
import { Panel } from './Panel';
import { PersonAvatar } from './PersonAvatar';

export interface MatchCardProps {
  person: Person;
  actions?: ReactNode;
}

export function MatchCard({ person, actions }: MatchCardProps) {
  const { t, lang } = useApp();
  const note = person.notes.trim();
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
      {note ? (
        <Panel tone="lantern" title={t('match.noteTitle')} className="mt-4">
          {note}
        </Panel>
      ) : null}
      {actions ? <div className="mt-6 space-y-3">{actions}</div> : null}
    </div>
  );
}
