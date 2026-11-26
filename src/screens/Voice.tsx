import { AlertCircle, Mic, Square, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appContext';
import {
  DeviceOnPill,
  DeviceProblem,
  EmptyState,
  LevelMeter,
  MatchCard,
  Panel,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  UnsureCard,
} from '../components/ui';
import { matchVoice, MicError, recordVoiceSample } from '../lib/voice';
import type { DeviceError, Id, SessionOutcome } from '../lib/types';

type Phase =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'noSpeech' }
  | { kind: 'match'; personId: Id }
  | { kind: 'unsure' }
  | { kind: 'mic'; error: DeviceError }
  | { kind: 'failed' };

export function VoiceScreen() {
  const { t, people, settings, back, replace, logSession } = useApp();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [level, setLevel] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const hasVoices = people.some((p) => p.voiceSamples.length > 0);

  function log(startedAt: number, outcome: SessionOutcome, personId: Id | null) {
    void logSession({
      type: 'voice',
      startedBy: settings.defaultStarter,
      startedAt,
      endedAt: Date.now(),
      outcome,
      personId,
      cards: 0,
      correctFirstTry: 0,
    }).catch(() => undefined);
  }

  async function start() {
    if (abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = Date.now();
    setLevel(0);
    setPhase({ kind: 'listening' });
    try {
      const capture = await recordVoiceSample({
        signal: controller.signal,
        onLevel: (rms) => {
          if (mountedRef.current && !controller.signal.aborted) setLevel(rms);
        },
      });
      abortRef.current = null;
      if (controller.signal.aborted || !capture) {
        log(startedAt, 'cancelled', null);
        if (mountedRef.current) setPhase(controller.signal.aborted ? { kind: 'idle' } : { kind: 'noSpeech' });
        return;
      }
      const result = matchVoice(capture.vector, people);
      const match = result.kind === 'match' ? people.find((p) => p.id === result.personId) : undefined;
      if (match) {
        log(startedAt, 'named', match.id);
        if (mountedRef.current) setPhase({ kind: 'match', personId: match.id });
      } else {
        log(startedAt, 'unsure', null);
        if (mountedRef.current) setPhase({ kind: 'unsure' });
      }
    } catch (err) {
      abortRef.current = null;
      if (!mountedRef.current) return;
      setPhase(err instanceof MicError ? { kind: 'mic', error: err.code } : { kind: 'failed' });
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    setPhase({ kind: 'idle' });
  }

  const header = <ScreenHeader title={t('voice.title')} onBack={back} />;
  const helper = <p className="px-5 pb-6 pt-8 text-center text-caption text-ink-soft">{t('voice.helper')}</p>;

  if (!hasVoices) {
    return (
      <Screen>
        {header}
        <EmptyState
          icon={<Users />}
          title={t('voice.noVoices.title')}
          body={t('voice.noVoices.body')}
          action={<PrimaryButton onClick={() => replace({ name: 'people' })}>{t('voice.noVoices.action')}</PrimaryButton>}
        />
        {helper}
      </Screen>
    );
  }

  if (phase.kind === 'mic') {
    return (
      <Screen>
        {header}
        <DeviceProblem kind="mic" error={phase.error} onRetry={reset} onBack={back} />
        {helper}
      </Screen>
    );
  }

  if (phase.kind === 'failed') {
    return (
      <Screen>
        {header}
        <EmptyState
          role="alert"
          icon={<AlertCircle />}
          title={t('error.title')}
          body={t('error.generic')}
          action={<PrimaryButton onClick={reset}>{t('common.tryAgain')}</PrimaryButton>}
        />
        {helper}
      </Screen>
    );
  }

  const matched = phase.kind === 'match' ? people.find((p) => p.id === phase.personId) : undefined;
  const listening = phase.kind === 'listening';
  const tryAgain = <PrimaryButton onClick={() => void start()}>{t('common.tryAgain')}</PrimaryButton>;

  return (
    <Screen>
      {header}
      <div className="space-y-6 px-5">
        {phase.kind === 'idle' || listening || phase.kind === 'noSpeech' ? (
          <p className="text-body text-ink-soft">{t('voice.intro')}</p>
        ) : null}

        {phase.kind === 'noSpeech' ? (
          <Panel tone="lantern" role="status">
            {t('voice.noSpeech')}
          </Panel>
        ) : null}

        {matched ? (
          <MatchCard person={matched} actions={<SecondaryButton onClick={() => void start()}>{t('common.tryAgain')}</SecondaryButton>} />
        ) : null}

        {phase.kind === 'unsure' || (phase.kind === 'match' && !matched) ? (
          <UnsureCard sentence={t('voice.unsure')} actions={tryAgain} />
        ) : null}

        {phase.kind === 'idle' || phase.kind === 'noSpeech' || listening ? (
          <div className="flex flex-col items-center gap-4 py-2">
            {listening ? (
              <>
                <DeviceOnPill kind="mic" className="!bg-river !text-white" />
                <p role="status" className="text-lead font-semibold text-ink">
                  {t('voice.listening')}
                </p>
                <div className="w-full max-w-xs">
                  <LevelMeter level={level} />
                </div>
              </>
            ) : null}
            <button
              type="button"
              onClick={listening ? stop : () => void start()}
              className={`flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full bg-river px-3 text-center text-lead font-semibold text-white shadow-lift ${
                listening ? 'animate-breathe ring-8 ring-river-tint' : ''
              }`}
            >
              {listening ? <Square aria-hidden="true" className="h-9 w-9" /> : <Mic aria-hidden="true" className="h-9 w-9" />}
              {listening ? t('voice.stop') : t('voice.press')}
            </button>
          </div>
        ) : null}
      </div>
      {helper}
    </Screen>
  );
}
