import { ArrowLeft, Heart, Images } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/appContext';
import {
  answer,
  createSession,
  currentCard,
  eligiblePeople,
  isLastStudy,
  next,
} from '../../lib/album';
import type { SessionState } from '../../lib/album';
import {
  ChoiceTile,
  EmptyState,
  Panel,
  PersonAvatar,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
} from '../../components/ui';
import { introduce } from '../../i18n';

/** Clock, only called from event handlers and cleanup. */
function now(): number {
  return Date.now();
}

interface LiveLog {
  startedAt: number;
  logged: boolean;
  session: SessionState | null;
}

/** Brings the answer panel and the Continue button into view on small phones. */
function revealOnMount(element: HTMLDivElement | null) {
  element?.scrollIntoView({ block: 'end' });
}

export function AlbumScreen() {
  const { t, lang, people, settings, navigate, back, goHome, logSession } = useApp();
  const [session, setSession] = useState<SessionState | null>(null);

  // Facts needed when the screen closes. Written in handlers, read on unmount.
  const live = useRef<LiveLog>({ startedAt: 0, logged: false, session: null });
  const logRef = useRef({ logSession, starter: settings.defaultStarter });
  useEffect(() => {
    logRef.current = { logSession, starter: settings.defaultStarter };
  });

  useEffect(() => {
    const log = live;
    const info = logRef;
    return () => {
      const run = log.current;
      if (!run.session || run.logged) return;
      run.logged = true;
      void info.current.logSession({
        type: 'album',
        startedBy: info.current.starter,
        startedAt: run.startedAt,
        endedAt: now(),
        outcome: 'cancelled',
        personId: null,
        cards: run.session.shown,
        correctFirstTry: run.session.correctFirstTry,
      });
    };
  }, []);

  function update(nextState: SessionState) {
    live.current.session = nextState;
    setSession(nextState);
    if (nextState.step.kind === 'end' && !live.current.logged) {
      live.current.logged = true;
      void logSession({
        type: 'album',
        startedBy: settings.defaultStarter,
        startedAt: live.current.startedAt,
        endedAt: now(),
        outcome: 'completed',
        personId: null,
        cards: nextState.shown,
        correctFirstTry: nextState.correctFirstTry,
      });
    }
  }

  function start() {
    const fresh = createSession(people, { browseOnly: settings.browseOnly });
    if (!fresh) return;
    live.current = { startedAt: now(), logged: false, session: fresh };
    setSession(fresh);
  }

  if (eligiblePeople(people).length < 2) {
    return (
      <Screen>
        <ScreenHeader title={t('album.title')} onBack={back} />
        <EmptyState
          icon={<Images />}
          title={t('album.empty.title')}
          body={t('album.empty.body')}
          action={
            <PrimaryButton onClick={() => navigate({ name: 'addPerson' })}>
              {t('album.empty.action')}
            </PrimaryButton>
          }
        />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <ScreenHeader title={t('album.title')} onBack={back} />
        <div className="space-y-6 px-5 pb-8">
          <p className="text-lead text-ink-soft">{t('album.intro')}</p>
          <PrimaryButton onClick={start}>{t('album.start')}</PrimaryButton>
        </div>
      </Screen>
    );
  }

  const step = session.step;
  const card = currentCard(session);

  const topRow = (
    <div className="flex items-center justify-between gap-3 px-5 pt-safe">
      <button
        type="button"
        onClick={back}
        className="-ml-2 inline-flex min-h-tap items-center gap-2 rounded-btn px-2 text-lead font-semibold text-river"
      >
        <ArrowLeft aria-hidden="true" />
        {t('common.back')}
      </button>
      <p className="text-body text-ink-soft">
        {t('album.progress', {
          current: session.progress.current,
          total: session.progress.total,
        })}
      </p>
    </div>
  );

  if (step.kind === 'end' || !card) {
    return (
      <Screen>
        {topRow}
        <div className="animate-rise-in space-y-6 px-5 py-10 text-center">
          <h1 className="sr-only">{t('album.title')}</h1>
          <Heart aria-hidden="true" className="mx-auto h-20 w-20 text-river" />
          <h2 className="font-display text-display text-ink">{t('album.end.title')}</h2>
          <p className="text-lead text-ink-soft">{t('album.end.body')}</p>
          <div className="space-y-3 pt-2">
            <PrimaryButton onClick={start}>{t('album.end.again')}</PrimaryButton>
            <SecondaryButton onClick={goHome}>{t('album.end.home')}</SecondaryButton>
          </div>
        </div>
      </Screen>
    );
  }

  const { person, photoUrl } = card;
  const sentence = introduce(lang, person.name, person.kinship);
  const photo = (
    <div className="flex justify-center">
      <PersonAvatar name={person.name} src={photoUrl} size="card" className="ring-4 ring-lantern" />
    </div>
  );

  return (
    <Screen>
      {topRow}
      {/* key restarts the gentle "appear" for each new card */}
      <div
        key={`${session.index}-${step.kind}-${'attempt' in step ? step.attempt : 0}`}
        className="animate-rise-in space-y-6 px-5 py-6"
        aria-live="polite"
      >
        <h1 className="sr-only">{t('album.title')}</h1>
        {photo}

        {step.kind === 'study' ? (
          <>
            <div className="text-center">
              <p className="font-display text-hero text-ink">{person.name}</p>
              <p className="mt-1 text-lead text-ink-soft">{sentence}</p>
            </div>
            <PrimaryButton onClick={() => update(next(session))}>
              {isLastStudy(session) ? t('common.done') : t('album.next')}
            </PrimaryButton>
          </>
        ) : (
          <>
            <h2 className="text-center font-display text-title text-ink">{t('album.prompt')}</h2>
            <div className="space-y-3">
              {step.choices.map((c) => {
                const chosenRight =
                  step.kind === 'feedback' && step.right && step.chosenId === c.personId;
                return (
                  <ChoiceTile
                    key={c.personId}
                    onSelect={() => update(answer(session, c.personId))}
                    ariaLabel={t('album.choiceLabel', { name: c.name })}
                    tone={chosenRight ? 'praise' : 'default'}
                    disabled={step.kind === 'feedback'}
                  >
                    {c.name}
                  </ChoiceTile>
                );
              })}
            </div>
            {step.kind === 'feedback' ? (
              <div className="space-y-6" ref={revealOnMount}>
                <Panel tone="lantern" role="status">
                  {step.right ? (
                    <p className="font-display text-title">{t(`album.praise.${step.praise}`)}</p>
                  ) : (
                    <p className="font-display text-title">{sentence}</p>
                  )}
                </Panel>
                <PrimaryButton onClick={() => update(next(session))}>
                  {t('album.continue')}
                </PrimaryButton>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Screen>
  );
}
