import { newId } from '../../lib/id';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/appContext';
import {
  ConfirmDialog,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SecondaryButton,
  StepBar,
  TextButton,
} from '../../components/ui';
import { FACE } from '../../lib/config';
import { cleanWhoLine } from '../../lib/notes';
import type { Id, Person } from '../../lib/types';
import { ConsentStep } from './ConsentStep';
import { DetailsStep } from './DetailsStep';
import { draftFromPerson, emptyDraft, kinshipOf, latestCaregiverName } from './draft';
import type { Draft } from './draft';
import { PhotosStep } from './PhotosStep';
import { SavedStep } from './SavedStep';
import type { SaveState } from './SavedStep';
import { VoiceStep } from './VoiceStep';

const TOTAL_STEPS = 5;

function Wizard({ initial }: { initial: Person | null }) {
  const { t, people, back, savePerson, notify, setBackGuard } = useApp();
  // `base` is the person being edited; null means a new person.
  const [base, setBase] = useState<Person | null>(initial);
  const [draft, setDraft] = useState<Draft>(() =>
    initial ? draftFromPerson(initial) : emptyDraft(latestCaregiverName(people)),
  );
  const [step, setStep] = useState(initial ? 2 : 1);
  const [touched, setTouched] = useState(false);
  const [showNeedAll, setShowNeedAll] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saving');
  const [freshId, setFreshId] = useState<Id>(() => newId());
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const firstStep = base ? 2 : 1;

  // The phone's back button must also ask before throwing away what was entered.
  const guardLeave = touched && step < 5;
  useEffect(() => {
    if (!guardLeave) return;
    setBackGuard(() => setConfirmLeave(true));
    return () => setBackGuard(null);
  }, [guardLeave, setBackGuard]);

  function update(patch: Partial<Draft>) {
    setTouched(true);
    setDraft((d) => ({ ...d, ...patch }));
  }

  const consentOk =
    draft.caregiverName.trim() !== '' && draft.agreedCaregiver && draft.agreedPerson;
  const nameOk = draft.name.trim() !== '';
  const photosOk = draft.photos.length >= FACE.photosMin;

  function leave() {
    if (touched && step < 5) setConfirmLeave(true);
    else back();
  }

  function next() {
    if (step === 1) {
      if (!consentOk) {
        setShowNeedAll(true);
        return;
      }
      setShowNeedAll(false);
    }
    setStep((s) => s + 1);
  }

  async function save() {
    setStep(5);
    setSaveState('saving');
    const now = Date.now();
    const person: Person = {
      id: base ? base.id : freshId,
      name: draft.name.trim(),
      kinship: kinshipOf(draft),
      whoLine: cleanWhoLine(draft.whoLine),
      birthday: /^\d{4}-\d{2}-\d{2}$/.test(draft.birthday) ? draft.birthday : '',
      phone: draft.phone.trim(),
      city: draft.city.trim(),
      // Taken from the newest saved copy: memories can change on the person page while this form is open.
      memoryNotes: base ? (people.find((p) => p.id === base.id)?.memoryNotes ?? base.memoryNotes) : [],
      photos: draft.photos,
      voiceSamples: draft.voiceSamples,
      consent: base
        ? base.consent
        : { caregiverName: draft.caregiverName.trim(), personAgreed: draft.agreedPerson, agreedAt: now },
      createdAt: base ? base.createdAt : now,
      updatedAt: now,
    };
    try {
      await savePerson(person);
    } catch {
      if (aliveRef.current) setSaveState('failed');
      return;
    }
    notify(t('toast.saved'), 'success');
    if (!aliveRef.current) return;
    setTouched(false);
    setSaveState('saved');
  }

  function another() {
    setBase(null);
    setFreshId(newId());
    setDraft(emptyDraft(draft.caregiverName));
    setTouched(false);
    setShowNeedAll(false);
    setStep(1);
  }

  const title = base ? t('add.title.edit') : t('add.title.new');
  const showBack = step > firstStep && step < 5;

  return (
    <Screen>
      <div className="flex min-h-dvh flex-col">
        <ScreenHeader title={title} onBack={leave} />
        <div className="px-5 pb-4">
          <StepBar current={step} total={TOTAL_STEPS} />
        </div>

        <main className="flex-1 px-5 pb-6">
          {step === 1 ? <ConsentStep draft={draft} update={update} showNeedAll={showNeedAll} /> : null}
          {step === 2 ? <DetailsStep draft={draft} update={update} /> : null}
          {step === 3 ? (
            <PhotosStep
              name={draft.name}
              photos={draft.photos}
              setPhotos={(fn) => {
                setTouched(true);
                setDraft((d) => ({ ...d, photos: fn(d.photos) }));
              }}
            />
          ) : null}
          {step === 4 ? (
            <VoiceStep
              name={draft.name}
              samples={draft.voiceSamples}
              setSamples={(fn) => {
                setTouched(true);
                setDraft((d) => ({ ...d, voiceSamples: fn(d.voiceSamples) }));
              }}
            />
          ) : null}
          {step === 5 ? (
            <SavedStep
              name={draft.name.trim()}
              state={saveState}
              onFinish={back}
              onAnother={another}
              onRetry={() => void save()}
              onBackToVoice={() => setStep(4)}
            />
          ) : null}
        </main>

        {step < 5 ? (
          <footer className="sticky bottom-0 space-y-3 border-t border-hairline bg-paper px-5 pb-safe pt-3">
            {step === 1 ? (
              <PrimaryButton aria-disabled={!consentOk} className={consentOk ? '' : 'opacity-50'} onClick={next}>
                {t('common.continue')}
              </PrimaryButton>
            ) : null}
            {step === 2 ? (
              <PrimaryButton disabled={!nameOk} onClick={next}>
                {t('common.continue')}
              </PrimaryButton>
            ) : null}
            {step === 3 ? (
              <PrimaryButton disabled={!photosOk} onClick={next}>
                {t('common.continue')}
              </PrimaryButton>
            ) : null}
            {step === 4 ? (
              draft.voiceSamples.length > 0 ? (
                <PrimaryButton onClick={() => void save()}>{t('common.save')}</PrimaryButton>
              ) : (
                <SecondaryButton onClick={() => void save()}>{t('add.voice.skip')}</SecondaryButton>
              )
            ) : null}
            {showBack ? (
              step === 4 ? (
                <TextButton onClick={() => setStep(3)}>{t('common.back')}</TextButton>
              ) : (
                <SecondaryButton onClick={() => setStep((s) => s - 1)}>{t('common.back')}</SecondaryButton>
              )
            ) : null}
          </footer>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title={t('add.leave.title')}
        body={t('add.leave.body')}
        confirmLabel={t('add.leave.confirm')}
        cancelLabel={t('add.leave.stay')}
        onConfirm={() => {
          setConfirmLeave(false);
          setBackGuard(null);
          back();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </Screen>
  );
}

export function AddPersonScreen({ editId }: { editId?: Id }) {
  const { people, back } = useApp();
  const person = editId ? (people.find((p) => p.id === editId) ?? null) : null;
  const missing = editId !== undefined && person === null;

  useEffect(() => {
    if (missing) back();
  }, [missing, back]);

  if (missing) return null;
  return <Wizard initial={person} />;
}
