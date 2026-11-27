import { Mic, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appContext';
import { MemoryNotesPanel } from '../components/notes/MemoryNotesPanel';
import { VoiceNotesPanel } from '../components/voice/VoiceNotesPanel';
import { Card, ConfirmDialog, DangerButton, Panel, Screen, ScreenHeader, SecondaryButton } from '../components/ui';
import { introduce } from '../i18n';
import { formatBirthday } from '../lib/notes';
import type { Id } from '../lib/types';

export function PersonDetailScreen({ personId }: { personId: Id }) {
  const { t, lang, people, navigate, back, deletePerson, notify } = useApp();
  const person = people.find((p) => p.id === personId);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [voiceCount, setVoiceCount] = useState<number | null>(null);
  // True while we delete on purpose, so the "person is gone" effect does not go back twice.
  const deletingRef = useRef(false);

  const missing = person === undefined;
  useEffect(() => {
    if (missing && !deletingRef.current) back();
  }, [missing, back]);

  if (!person) return null;

  const facts = [
    { label: t('person.birthday'), value: formatBirthday(person.birthday) },
    { label: t('person.phone'), value: person.phone.trim() },
    { label: t('person.city'), value: person.city.trim() },
  ].filter((fact) => fact.value !== '');

  async function confirmDelete() {
    setConfirming(false);
    setFailed(false);
    deletingRef.current = true;
    try {
      await deletePerson(personId);
      notify(t('toast.deleted'), 'success');
      back();
    } catch {
      deletingRef.current = false;
      setFailed(true);
    }
  }

  return (
    <Screen>
      <ScreenHeader title={person.name} onBack={back} />
      <main className="space-y-6 px-5 pb-8 pt-3">
        {person.photos.length > 0 ? (
          <section aria-label={t('person.photos')}>
            <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
              {person.photos.map((photo) => (
                <li key={photo.id} className="shrink-0">
                  <img
                    src={photo.dataUrl}
                    alt={t('common.photoOf', { name: person.name })}
                    className="h-32 w-32 rounded-tile object-cover"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-caption font-semibold text-ink-soft">{t('person.kinship')}</h2>
          <p className="font-display text-lead text-ink">{introduce(lang, person.name, person.kinship)}</p>
          {person.whoLine.trim() ? <p className="break-words text-body text-ink">{person.whoLine.trim()}</p> : null}
          {person.voiceSamples.length > 0 ? (
            <p className="inline-flex items-center gap-2 text-body text-ink-soft">
              <Mic aria-hidden="true" size={20} />
              {t('person.hasVoice')}
            </p>
          ) : null}
        </section>

        {facts.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-caption font-semibold text-ink-soft">{t('person.about')}</h2>
            <Card>
              <dl className="space-y-3">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-caption font-semibold text-ink-soft">{fact.label}</dt>
                    <dd className="break-words text-body text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
        ) : null}

        <MemoryNotesPanel person={person} voiceCount={voiceCount} />

        <VoiceNotesPanel person={person} writtenCount={person.memoryNotes.length} onCount={setVoiceCount} />

        {failed ? (
          <Panel tone="lantern" role="alert">
            {t('error.generic')}
          </Panel>
        ) : null}

        <div className="space-y-3">
          <SecondaryButton icon={<Pencil />} onClick={() => navigate({ name: 'addPerson', editId: person.id })}>
            {t('person.edit')}
          </SecondaryButton>
          <DangerButton quiet icon={<Trash2 />} onClick={() => setConfirming(true)}>
            {t('person.delete')}
          </DangerButton>
        </div>
      </main>
      <ConfirmDialog
        open={confirming}
        danger
        title={t('person.delete.title')}
        body={t('person.delete.body', { name: person.name })}
        confirmLabel={t('person.delete.confirm')}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
