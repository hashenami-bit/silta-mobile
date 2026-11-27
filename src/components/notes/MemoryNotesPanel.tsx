import { Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../../app/appContext';
import { NOTES } from '../../lib/config';
import { newId } from '../../lib/id';
import { notesLeft } from '../../lib/notes';
import type { Id, MemoryNote, NoteVisibility, Person } from '../../lib/types';
import { ConfirmDialog, DangerButton, Panel, PrimaryButton, Switch, TextAreaField } from '../ui';

interface Props {
  person: Person;
  /** Voice notes share the same limit. null = not counted yet, so nothing can be added for now. */
  voiceCount: number | null;
}

/** Caregiver's list of short written memories about one person. */
export function MemoryNotesPanel({ person, voiceCount }: Props) {
  const { t, db, savePerson, notify } = useApp();
  const [text, setText] = useState('');
  // Off at first: a note reaches the elder's screen only after the caregiver turns this on.
  const [showToElder, setShowToElder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [deleteId, setDeleteId] = useState<Id | null>(null);
  // One change at a time: a second change must never start from an out-of-date list.
  const savingRef = useRef(false);

  const notes = person.memoryNotes;
  const full = voiceCount !== null && notesLeft(notes.length, voiceCount) === 0;
  const clean = text.trim();

  /** Applies one change to the newest saved copy of the person. Returns false when nothing was saved. */
  async function saveNotes(change: (current: MemoryNote[]) => MemoryNote[] | null): Promise<boolean> {
    if (savingRef.current) return false;
    savingRef.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const fresh = (await db.getPerson(person.id)) ?? person;
      const next = change(fresh.memoryNotes);
      if (next === null) return false;
      await savePerson({ ...fresh, memoryNotes: next, updatedAt: Date.now() });
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }

  async function add() {
    if (!clean || full || busy || voiceCount === null) return;
    const note: MemoryNote = {
      id: newId(),
      text: clean.slice(0, NOTES.textMaxChars),
      visibility: showToElder ? 'elder' : 'caregiver',
      createdAt: Date.now(),
    };
    const saved = await saveNotes((current) =>
      notesLeft(current.length, voiceCount) === 0 ? null : [...current, note],
    );
    if (saved) {
      setText('');
      notify(t('toast.memorySaved'), 'success');
    }
  }

  function setVisibility(id: Id, visibility: NoteVisibility) {
    void saveNotes((current) => current.map((n) => (n.id === id ? { ...n, visibility } : n)));
  }

  function confirmDelete() {
    const id = deleteId;
    setDeleteId(null);
    if (!id) return;
    void saveNotes((current) => current.filter((n) => n.id !== id));
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-title text-ink">{t('memory.title')}</h2>
        <p className="mt-1 text-body text-ink-soft">{t('memory.intro')}</p>
        <p className="mt-1 text-caption font-semibold text-ink-soft">
          {t('memory.count', { count: notes.length + (voiceCount ?? 0), max: NOTES.maxPerPerson })}
        </p>
      </div>

      {notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="space-y-3 rounded-tile bg-surface p-4 shadow-lift">
              <p className="whitespace-pre-wrap break-words text-body text-ink">{note.text}</p>
              <Switch
                label={t('memory.show.label')}
                checked={note.visibility === 'elder'}
                disabled={busy}
                onChange={(on) => setVisibility(note.id, on ? 'elder' : 'caregiver')}
              />
              <DangerButton quiet icon={<Trash2 />} disabled={busy} onClick={() => setDeleteId(note.id)}>
                {t('memory.delete')}
              </DangerButton>
            </li>
          ))}
        </ul>
      ) : null}

      {failed ? (
        <Panel tone="lantern" role="alert">
          {t('error.generic')}
        </Panel>
      ) : null}

      {full ? (
        <Panel tone="lantern" role="status">
          {t('memory.full', { max: NOTES.maxPerPerson })}
        </Panel>
      ) : (
        <div className="space-y-3 rounded-tile bg-river-tint p-4">
          <TextAreaField
            label={t('memory.new.label')}
            placeholder={t('memory.new.placeholder')}
            rows={2}
            maxLength={NOTES.textMaxChars}
            value={text}
            onChange={setText}
          />
          <Switch
            label={t('memory.show.label')}
            hint={t('memory.show.hint')}
            checked={showToElder}
            onChange={setShowToElder}
          />
          <PrimaryButton icon={<Plus />} disabled={!clean || busy || voiceCount === null} onClick={() => void add()}>
            {t('memory.add')}
          </PrimaryButton>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title={t('memory.delete.title')}
        body={t('memory.delete.body')}
        confirmLabel={t('memory.delete')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </section>
  );
}
