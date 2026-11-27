import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../../app/appContext';
import { elderVoiceNotes, pickByTurn } from '../../lib/notes';
import type { Id, VoiceNote } from '../../lib/types';
// Imported one by one (not from '../ui') because the ui folder's MatchCard imports this file.
import { SecondaryButton } from '../ui/SecondaryButton';
import { useNotePlayer } from './useNotePlayer';

/** A "listen" button for one family voice message the elder may hear. Shows nothing when there is none. */
export function ElderVoiceNote({ personId, turn }: { personId: Id; turn: number }) {
  const { t, db } = useApp();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const player = useNotePlayer();

  useEffect(() => {
    let cancelled = false;
    db.listVoiceNotes(personId).then(
      (list) => {
        if (!cancelled) setNotes(elderVoiceNotes(list));
      },
      () => undefined, // no message is fine: the card still shows the name
    );
    return () => {
      cancelled = true;
    };
  }, [db, personId]);

  const note = pickByTurn(notes, turn);
  if (!note) return null;
  const playing = player.playingId === note.id;
  return (
    <div className="mt-4">
      <SecondaryButton
        icon={playing ? <Square /> : <Play />}
        onClick={() => player.toggle(note)}
        aria-pressed={playing}
      >
        {t(playing ? 'voiceNotes.stop' : 'match.listen')}
      </SecondaryButton>
    </div>
  );
}
