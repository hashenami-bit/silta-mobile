import { VOICE } from '../../lib/config';
import { newId } from '../../lib/id';
import { Mic, Play, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/appContext';
import type { TextKey } from '../../i18n';
import type { DeviceError, Person, VoiceNote } from '../../lib/types';
import { MicError, startVoiceNote } from '../../lib/voice';
import type { NoteRecorder } from '../../lib/voice/api';
import { ConfirmDialog, DangerButton, DeviceOnPill, Panel, PrimaryButton, SecondaryButton } from '../ui';

const MIN_NOTE_MS = 500;

export function VoiceNotesPanel({ person }: { person: Person }) {
  const { t, db, notify } = useApp();
  const [notes, setNotes] = useState<VoiceNote[] | null>(null);
  const [version, setVersion] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<DeviceError | null>(null);
  const [failed, setFailed] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const recorderRef = useRef<NoteRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  function stopPlayback() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recorderRef.current?.cancel();
      recorderRef.current = null;
      audioRef.current?.pause();
      audioRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    db.listVoiceNotes(person.id).then(
      (list) => {
        if (cancelled) return;
        setNotes(list);
        setLoadFailed(false);
      },
      () => {
        if (!cancelled) setLoadFailed(true);
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
    stopPlayback();
    setPlayingId(null);
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
      await db.addVoiceNote({
        id: newId(),
        personId: person.id,
        audio: result.audio,
        mimeType: result.mimeType,
        durationMs: result.durationMs,
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

  function togglePlay(note: VoiceNote) {
    const wasPlaying = playingId === note.id;
    stopPlayback();
    if (wasPlaying) {
      setPlayingId(null);
      return;
    }
    const url = URL.createObjectURL(new Blob([note.audio], { type: note.mimeType }));
    const audio = new Audio(url);
    urlRef.current = url;
    audioRef.current = audio;
    const done = () => {
      if (audioRef.current !== audio) return;
      stopPlayback();
      if (mountedRef.current) setPlayingId(null);
    };
    audio.addEventListener('ended', done);
    audio.addEventListener('error', done);
    setPlayingId(note.id);
    audio.play().catch(done);
  }

  async function confirmDelete() {
    const id = deleteId;
    setDeleteId(null);
    if (!id) return;
    if (playingId === id) {
      stopPlayback();
      setPlayingId(null);
    }
    try {
      await db.deleteVoiceNote(id);
      if (mountedRef.current) setVersion((v) => v + 1);
    } catch {
      if (mountedRef.current) setFailed(true);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="font-display text-title text-ink">{t('voiceNotes.title')}</h2>

      {notes && notes.length === 0 ? <p className="text-body text-ink-soft">{t('voiceNotes.empty')}</p> : null}

      {notes && notes.length > 0 ? (
        <ul className="space-y-3">
          {notes.map((note) => {
            const playing = playingId === note.id;
            const secs = Math.max(1, Math.round(note.durationMs / 1000));
            return (
              <li key={note.id} className="space-y-3 rounded-tile bg-surface p-4 shadow-lift">
                <p className="text-body font-semibold text-ink">{t('voiceNotes.item', { seconds: secs })}</p>
                <div className="grid grid-cols-1 gap-3">
                  <SecondaryButton
                    icon={playing ? <Square /> : <Play />}
                    onClick={() => togglePlay(note)}
                    aria-pressed={playing}
                  >
                    {t(playing ? 'voiceNotes.stop' : 'voiceNotes.play')}
                  </SecondaryButton>
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
      ) : (
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
