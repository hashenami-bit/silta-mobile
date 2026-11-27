import { useEffect, useRef, useState } from 'react';
import type { Id, VoiceNote } from '../../lib/types';

export interface NotePlayer {
  /** The note that is playing now, or null. */
  playingId: Id | null;
  /** Plays the note, or stops it when it is the one playing. Call from a button press. */
  toggle(note: VoiceNote): void;
  stop(): void;
}

/** Plays one voice note at a time and cleans up when the screen closes. */
export function useNotePlayer(): NotePlayer {
  const [playingId, setPlayingId] = useState<Id | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  function release() {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      audioRef.current?.pause();
      audioRef.current = null;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, []);

  function stop() {
    release();
    setPlayingId(null);
  }

  function toggle(note: VoiceNote) {
    const wasPlaying = playingId === note.id;
    release();
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
      release();
      if (mountedRef.current) setPlayingId(null);
    };
    audio.addEventListener('ended', done);
    audio.addEventListener('error', done);
    setPlayingId(note.id);
    audio.play().catch(done);
  }

  return { playingId, toggle, stop };
}
