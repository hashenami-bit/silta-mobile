import { TriangleAlert, UserPlus, SwitchCamera, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appContext';
import {
  DeviceOnPill,
  DeviceProblem,
  EmptyState,
  MatchCard,
  OvalGuide,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  UnsureCard,
} from '../components/ui';
import { useCamera } from '../lib/camera';
import { FACE } from '../lib/config';
import { getFaceEngine, useFaceWatch } from '../lib/face';
import type { Id, SessionOutcome } from '../lib/types';

type EngineState = 'idle' | 'loading' | 'ready' | 'failed';

interface UnsureTimers {
  unsure: number | null;
  grace: number | null;
}

function clearUnsureTimers(timers: UnsureTimers) {
  if (timers.unsure !== null) window.clearTimeout(timers.unsure);
  if (timers.grace !== null) window.clearTimeout(timers.grace);
  timers.unsure = null;
  timers.grace = null;
}

function Session() {
  const { t, people, settings, back, replace, logSession } = useApp();
  const { state: camState, videoRef, start: startCamera, stop: stopCamera, switchFacing } = useCamera();
  const [engine, setEngine] = useState<EngineState>('idle');

  const aliveRef = useRef(true);
  const startedAtRef = useRef<number | null>(null);
  const namedIdRef = useRef<Id | null>(null);
  const unsureShownRef = useRef(false);
  const latest = useRef({ logSession, starter: settings.defaultStarter });

  useEffect(() => {
    latest.current = { logSession, starter: settings.defaultStarter };
  });

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      const startedAt = startedAtRef.current;
      if (startedAt === null) return;
      startedAtRef.current = null;
      const named = namedIdRef.current;
      const outcome: SessionOutcome = named ? 'named' : unsureShownRef.current ? 'unsure' : 'cancelled';
      void latest.current.logSession({
        type: 'face',
        startedBy: latest.current.starter,
        startedAt,
        endedAt: Date.now(),
        outcome,
        personId: named,
        cards: 0,
        correctFirstTry: 0,
      });
    };
  }, []);

  const cameraReady = camState.status === 'ready';
  const facing = camState.status === 'ready' ? camState.facing : 'environment';
  const ready = cameraReady && engine === 'ready';

  // The person whose card is open. Set from the watch, cleared only by "again".
  const [namedId, setNamedId] = useState<Id | null>(null);
  const [unsureShown, setUnsureShown] = useState(false);

  const matched = namedId ? (people.find((p) => p.id === namedId) ?? null) : null;
  const showMatch = matched !== null;
  const showUnsure = !showMatch && unsureShown;

  const watch = useFaceWatch({ video: videoRef, people, enabled: ready && !showMatch && !showUnsure });
  const result = watch.result;

  // The face engine broke in the middle (many failed checks in a row): turn the camera off
  // and show the calm "did not work" card instead of looking forever.
  const watchFailed = watch.failed;
  const cameraOn = camState.status !== 'idle';
  useEffect(() => {
    if (watchFailed && cameraOn) stopCamera();
  }, [watchFailed, cameraOn, stopCamera]);

  // A match opens the card (only for someone who still exists).
  if (
    result?.kind === 'match' &&
    namedId === null &&
    !unsureShown &&
    people.some((p) => p.id === result.personId)
  ) {
    setNamedId(result.personId);
  }
  // The person was deleted while the card was open: close it and look again.
  if (namedId !== null && matched === null) setNamedId(null);

  useEffect(() => {
    if (namedId) namedIdRef.current = namedId;
  }, [namedId]);

  // "Unsure" = a face is there but nobody is named. After FACE.unsureAfterMs of that,
  // the gentle card appears. A short "no face" gap does not restart the wait.
  const timersRef = useRef<UnsureTimers>({ unsure: null, grace: null });

  const kind = result?.kind ?? null;
  useEffect(() => {
    const timers = timersRef.current;
    if (kind === 'unsure') {
      if (timers.grace !== null) {
        window.clearTimeout(timers.grace);
        timers.grace = null;
      }
      if (timers.unsure === null) {
        timers.unsure = window.setTimeout(() => {
          timers.unsure = null;
          unsureShownRef.current = true;
          setUnsureShown(true);
        }, FACE.unsureAfterMs);
      }
    } else if (kind === 'match') {
      clearUnsureTimers(timers);
    } else if (timers.unsure !== null && timers.grace === null) {
      timers.grace = window.setTimeout(() => clearUnsureTimers(timers), FACE.checkIntervalMs * 3);
    }
  }, [kind]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => clearUnsureTimers(timers);
  }, []);

  async function begin() {
    // The engine broke in the middle: load it from scratch, not just "again".
    if (watchFailed) getFaceEngine().reset();
    watch.reset();
    setEngine('loading');
    const ok = await getFaceEngine()
      .load()
      .then(
        () => true,
        () => false,
      );
    if (!aliveRef.current) return;
    if (!ok) {
      setEngine('failed');
      return;
    }
    setEngine('ready');
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    await startCamera('environment');
  }

  function lookAgain() {
    clearUnsureTimers(timersRef.current);
    watch.reset();
    setNamedId(null);
    setUnsureShown(false);
  }

  const cameraError = camState.status === 'error' ? camState.error : null;

  if (engine === 'failed' || watchFailed) {
    return (
      <Screen>
        <EmptyState
          role="alert"
          icon={<TriangleAlert />}
          title={t('error.title')}
          body={t('error.generic')}
          action={
            <>
              <PrimaryButton onClick={() => void begin()}>{t('common.tryAgain')}</PrimaryButton>
              <SecondaryButton onClick={back}>{t('common.back')}</SecondaryButton>
            </>
          }
        />
      </Screen>
    );
  }

  if (cameraError) {
    return (
      <Screen>
        <DeviceProblem kind="camera" error={cameraError} onRetry={() => void begin()} onBack={back} />
      </Screen>
    );
  }

  if (engine === 'idle') {
    return (
      <Screen>
        <ScreenHeader title={t('recognize.title')} onBack={back} />
        <div className="space-y-6 px-5 pb-8 pt-2">
          <p className="text-body text-ink-soft">{t('recognize.intro')}</p>
          <PrimaryButton onClick={() => void begin()}>{t('recognize.start')}</PrimaryButton>
        </div>
      </Screen>
    );
  }

  if (!ready) {
    return (
      <Screen tone="night">
        <div className="fixed inset-0 bg-night">
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-5 pt-safe">
            <div className="pt-3">{camState.status !== 'idle' ? <DeviceOnPill kind="camera" /> : null}</div>
            <div className="pt-3">
              <button
                type="button"
                onClick={back}
                className="flex min-h-tap min-w-tap flex-col items-center justify-center rounded-btn bg-night/70 px-3 py-1 text-caption font-semibold text-white"
              >
                <X aria-hidden="true" />
                {camState.status !== 'idle' ? t('recognize.close') : t('common.close')}
              </button>
            </div>
          </div>
          <div role="status" className="flex min-h-dvh items-center justify-center px-5 text-center">
            <p className="font-display text-title text-white">{t('recognize.starting')}</p>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen tone="night">
      <div className="fixed inset-0 bg-night">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover${facing === 'user' ? ' -scale-x-100' : ''}`}
        />
        {showMatch || showUnsure ? <div className="absolute inset-0 bg-night/70 animate-fade-in" /> : null}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-5 pt-safe">
          <div className="pt-3">
            <DeviceOnPill kind="camera" />
          </div>
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => void switchFacing()}
              className="flex min-h-tap min-w-tap flex-col items-center justify-center rounded-btn bg-night/70 px-3 py-1 text-caption font-semibold text-white"
            >
              <SwitchCamera aria-hidden="true" />
              {t('recognize.switch')}
            </button>
            <button
              type="button"
              onClick={back}
              className="flex min-h-tap min-w-tap flex-col items-center justify-center rounded-btn bg-night/70 px-3 py-1 text-caption font-semibold text-white"
            >
              <X aria-hidden="true" />
              {t('recognize.close')}
            </button>
          </div>
        </div>

        {!showMatch && !showUnsure ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <OvalGuide />
            </div>
            <p
              role="status"
              className="absolute inset-x-0 bottom-0 px-5 pb-safe text-center text-body font-semibold text-white"
            >
              <span className="mb-6 inline-block rounded-btn bg-night/70 px-4 py-2">{t('recognize.looking')}</span>
            </p>
          </>
        ) : null}

        {matched ? (
          <div className="absolute inset-x-0 bottom-0 px-5 pb-safe">
            <div className="pb-5">
              <MatchCard
                person={matched}
                actions={
                  <>
                    <PrimaryButton onClick={lookAgain}>{t('recognize.again')}</PrimaryButton>
                    <SecondaryButton onClick={back}>{t('common.close')}</SecondaryButton>
                  </>
                }
              />
            </div>
          </div>
        ) : null}

        {showUnsure ? (
          <div className="absolute inset-x-0 bottom-0 px-5 pb-safe">
            <div className="pb-5">
              <UnsureCard
                actions={
                  <>
                    <PrimaryButton onClick={lookAgain}>{t('recognize.tryAgain')}</PrimaryButton>
                    <SecondaryButton onClick={() => replace({ name: 'album' })}>
                      {t('recognize.openAlbum')}
                    </SecondaryButton>
                  </>
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </Screen>
  );
}

export function RecognizeScreen() {
  const { t, people, navigate, back } = useApp();
  if (people.length === 0) {
    return (
      <Screen>
        <ScreenHeader title={t('recognize.title')} onBack={back} />
        <EmptyState
          icon={<UserPlus />}
          title={t('recognize.noPeople.title')}
          body={t('recognize.noPeople.body')}
          action={
            <PrimaryButton onClick={() => navigate({ name: 'addPerson' })}>
              {t('recognize.noPeople.action')}
            </PrimaryButton>
          }
        />
      </Screen>
    );
  }
  return <Session />;
}
