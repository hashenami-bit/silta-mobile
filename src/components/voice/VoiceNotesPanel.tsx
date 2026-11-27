import { NOTES, VOICE } from '../../lib/config';
import { newId } from '../../lib/id';
import { Mic, Play, Square, Trash2 } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useApp } from '../../app/appContext';
import type { TextKey } from '../../i18n';
import { notesLeft } from '../../lib/notes';
import type { DeviceError, NoteVisibility, Person, VoiceNote } from '../../lib/types';
import { MicError, startVoiceNote } from '../../lib/voice';
import type { NoteRecorder } from '../../lib/voice/api';
import { ConfirmDialog, DangerButton, DeviceOnPill, Panel, PrimaryButton, SecondaryButton, Switch } from '../ui';
import { useNotePlayer } from './useNotePlayer';

const MIN_NOTE_MS = 500;

interface Props {
  person: Person;
  /** Written memories share the same limit. */
  writtenCount: number;
  /** Told how many voice notes are saved, after each load. */
  onCount?: (count: number) => void;
}

export function VoiceNotesPanel({ person, writtenCount, onCount }: Props) {
  const { t, db, notify } = useApp();
  const player = useNotePlayer();
  // Kept out of the loading effect's inputs, so a new function from the parent never reloads the list.
  const reportCount = useEffectEvent((count: number) => onCount?.(count));
  const [notes, setNotes] = useState<VoiceNote[] | null>(null);
  const [version, setVersion] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<DeviceError | null>(null);
  const [failed, setFailed] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const recorderRef = useRef<NoteRecorder | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recorderRef.current?.cancel();
      recorderRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    db.listVoiceNotes(person.id).then(
      (list) => {
        if (cancelled) return;
        setNotes(list);
        setLoadFailed(false);
        reportCount(list.length);
      },
      () => {
        if (cancelled) return;
        setLoadFailed(true);
        // Storage did not answer: let written memories be added rather than leave the page stuck.
        reportCount(0);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db, person.id, version]);

  useEffect(() => {
    if (!recording) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  const autoStopRef = useRef<number | undefined>(undefined);

  async function startRecording() {
    if (recorderRef.current || starting) return;
    player.stop();
    setMicError(null);
    setFailed(false);
    setStarting(true);
    try {
      const recorder = await startVoiceNote({
        // Ended by itself (app was in the background, time limit): save it like a normal stop.
        onEnd: () => void stopRecording(),
      });
      if (!mountedRef.current) {
        recorder.cancel();
        return;
      }
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
      // The recorder stops by itself at the limit; make the screen follow.
      autoStopRef.current = window.setTimeout(() => void stopRecording(), VOICE.noteMaxMs + 300);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof MicError) setMicError(err.code);
      else setFailed(true);
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }

  async function stopRecording() {
    window.clearTimeout(autoStopRef.current);
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setRecording(false);
    try {
      const result = await recorder.stop();
      if (!mountedRef.current || result.durationMs < MIN_NOTE_MS) return;
      // Count again from storage: a written memory may have been added while this was recording.
      const [saved, voices] = await Promise.all([db.getPerson(person.id), db.listVoiceNotes(person.id)]);
      if (notesLeft(saved?.memoryNotes.length ?? 0, voices.length) === 0) {
        if (mountedRef.current) setVersion((v) => v + 1);
        notify(t('memory.full', { max: NOTES.maxPerPerson }));
        return;
      }
      await db.addVoiceNote({
        id: newId(),
        personId: person.id,
        audio: result.audio,
        mimeType: result.mimeType,
        durationMs: result.durationMs,
        // Stays with the caregiver until the switch on the row is turned on.
        visibility: 'caregiver',
        createdAt: Date.now(),
      });
      if (!mountedRef.current) return;
      notify(t('toast.noteSaved'), 'success');
      setVersion((v) => v + 1);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof MicError) setMicError(err.code);
      else setFailed(true);
    }
  }

  async function setVisibility(note: VoiceNote, visibility: NoteVisibility) {
    setFailed(false);
    try {
      await db.addVoiceNote({ ...note, visibility });
      if (mountedRef.current) setVersion((v) => v + 1);
    } catch {
      if (mountedRef.current) setFailed(true);
    }
  }

  async function confirmDelete() {
    const id = deleteId;
    setDeleteId(null);
    if (!id) return;
    if (player.playingId === id) player.stop();
    try {
      await db.deleteVoiceNote(id);
      if (mountedRef.current) setVersion((v) => v + 1);
    } catch {
      if (mountedRef.current) setFailed(true);
    }
  }

  const full = notes !== null && notesLeft(writtenCount, notes.length) === 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-title text-ink">{t('voiceNotes.title')}</h2>
        <p className="mt-1 text-caption text-ink-soft">
          {t('voiceNotes.limit', { seconds: Math.round(VOICE.noteMaxMs / 1000) })}
        </p>
      </div>

      {notes && notes.length === 0 ? <p className="text-body text-ink-soft">{t('voiceNotes.empty')}</p> : null}

      {notes && notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => {
            const playing = player.playingId === note.id;
            const secs = Math.max(1, Math.round(note.durationMs / 1000));
            return (
              <li key={note.id} className="space-y-3 rounded-tile bg-surface p-4 shadow-lift">
                <p className="text-body font-semibold text-ink">{t('voiceNotes.item', { seconds: secs })}</p>
                <div className="grid grid-cols-1 gap-3">
                  <SecondaryButton
                    icon={playing ? <Square /> : <Play />}
                    onClick={() => player.toggle(note)}
                    aria-pressed={playing}
                  >
                    {t(playing ? 'voiceNotes.stop' : 'voiceNotes.play')}
                  </SecondaryButton>
                  <Switch
                    label={t('voiceNotes.share.label')}
                    checked={note.visibility === 'elder'}
                    onChange={(on) => void setVisibility(note, on ? 'elder' : 'caregiver')}
                  />
                  <DangerButton quiet icon={<Trash2 />} onClick={() => setDeleteId(note.id)}>
                    {t('voiceNotes.delete')}
                  </DangerButton>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {loadFailed ? (
        <Panel tone="lantern" role="status">
          {t('error.generic')}
        </Panel>
      ) : null}

      {micError ? (
        <Panel
          tone="lantern"
          role="alert"
          title={t((micError === 'denied' ? 'mic.denied.title' : 'mic.problem.title') as TextKey)}
        >
          {t(`mic.${micError}.body` as TextKey)}
        </Panel>
      ) : null}

      {failed ? (
        <Panel tone="lantern" role="alert">
          {t('error.generic')}
        </Panel>
      ) : null}

      {recording ? (
        <div className="space-y-3 rounded-tile bg-river-tint p-4">
          <DeviceOnPill kind="mic" className="!bg-river" />
          <p role="status" className="text-lead font-semibold text-ink">
            {t('voiceNotes.recording')} <span className="tabular-nums">{seconds}</span>
          </p>
          <PrimaryButton icon={<Square />} onClick={() => void stopRecording()}>
            {t('voiceNotes.stop')}
          </PrimaryButton>
        </div>
      ) : full ? (
        <Panel tone="lantern" role="status">
          {t('memory.full', { max: NOTES.maxPerPerson })}
        </Panel>
      ) : notes === null && !loadFailed ? null : (
        <SecondaryButton icon={<Mic />} disabled={starting} onClick={() => void startRecording()}>
          {t('voiceNotes.record')}
        </SecondaryButton>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title={t('voiceNotes.delete.title')}
        body={t('voiceNotes.delete.body')}
        confirmLabel={t('voiceNotes.delete')}
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </section>
  );
}
