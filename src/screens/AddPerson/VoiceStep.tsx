import { newId } from '../../lib/id';
import { Check, Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/appContext';
import {
  DeviceOnPill,
  DeviceProblem,
  LevelMeter,
  Panel,
  PrimaryButton,
  SecondaryButton,
} from '../../components/ui';
import { VOICE } from '../../lib/config';
import { MicError, recordVoiceSample } from '../../lib/voice';
import type { DeviceError, VoiceSample } from '../../lib/types';
import type { ListUpdater } from './draft';

interface Props {
  name: string;
  samples: VoiceSample[];
  setSamples: ListUpdater<VoiceSample>;
}

export function VoiceStep({ name, samples, setSamples }: Props) {
  const { t } = useApp();
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [noSpeech, setNoSpeech] = useState(false);
  const [micError, setMicError] = useState<DeviceError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Leaving the step: stop listening and release the microphone.
      abortRef.current?.abort();
    };
  }, []);

  async function record() {
    const ac = new AbortController();
    abortRef.current = ac;
    setRecording(true);
    setLevel(0);
    setNoSpeech(false);
    setMicError(null);
    try {
      const capture = await recordVoiceSample({
        signal: ac.signal,
        onLevel: (rms) => {
          if (!ac.signal.aborted) setLevel(rms);
        },
      });
      if (ac.signal.aborted) return;
      if (capture) {
        const sample: VoiceSample = { id: newId(), vector: capture.vector, createdAt: Date.now() };
        setSamples((prev) => (prev.length >= VOICE.samplesPerPerson ? prev : [...prev, sample]));
      } else {
        setNoSpeech(true);
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      setMicError(err instanceof MicError ? err.code : 'unknown');
    }
    setRecording(false);
  }

  function stopRecording() {
    abortRef.current?.abort();
    setRecording(false);
    setLevel(0);
  }

  const total = VOICE.samplesPerPerson;
  const done = samples.length;
  const full = done >= total;

  if (micError) {
    return (
      <DeviceProblem
        kind="mic"
        error={micError}
        onRetry={() => void record()}
        onBack={() => setMicError(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-title text-ink">{t('add.voice.title')}</h2>
        <p className="mt-2 text-body text-ink-soft">{t('add.voice.intro', { name: name.trim() })}</p>
      </div>

      {done > 0 ? (
        <p className="flex items-center gap-2 text-body font-semibold text-river">
          <Check aria-hidden="true" />
          {t('add.voice.recorded')}
        </p>
      ) : null}

      {noSpeech ? (
        <Panel tone="lantern" role="status">
          {t('add.voice.noSpeech')}
        </Panel>
      ) : null}

      {recording ? (
        <div className="space-y-4">
          <DeviceOnPill kind="mic" />
          <p role="status" className="font-display text-title text-ink">
            {t('add.voice.listening')}
          </p>
          <LevelMeter level={level} />
          <SecondaryButton icon={<Square />} onClick={stopRecording}>
            {t('add.voice.stop')}
          </SecondaryButton>
        </div>
      ) : full ? null : (
        <div className="space-y-3">
          <p className="text-body text-ink-soft">
            {t('add.voice.sample', { current: done + 1, total })}
          </p>
          {done === 0 ? (
            <PrimaryButton icon={<Mic />} onClick={() => void record()}>
              {t('add.voice.record')}
            </PrimaryButton>
          ) : (
            <SecondaryButton icon={<Mic />} onClick={() => void record()}>
              {t('add.voice.record')}
            </SecondaryButton>
          )}
        </div>
      )}
    </div>
  );
}
