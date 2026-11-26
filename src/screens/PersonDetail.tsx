import { Mic, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appContext';
import { VoiceNotesPanel } from '../components/voice/VoiceNotesPanel';
import { Card, ConfirmDialog, DangerButton, Panel, Screen, ScreenHeader, SecondaryButton } from '../components/ui';
import { introduce } from '../i18n';
import type { Id } from '../lib/types';

export function PersonDetailScreen({ personId }: { personId: Id }) {
  const { t, lang, people, navigate, back, deletePerson, notify } = useApp();
  const person = people.find((p) => p.id === personId);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  // True while we delete on purpose, so the "person is gone" effect does not go back twice.
  const deletingRef = useRef(false);

  const missing = person === undefined;
  useEffect(() => {
    if (missing && !deletingRef.current) back();
  }, [missing, back]);

  if (!person) return null;

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
          {person.voiceSamples.length > 0 ? (
            <p className="inline-flex items-center gap-2 text-body text-ink-soft">
              <Mic aria-hidden="true" size={20} />
              {t('person.hasVoice')}
            </p>
          ) : null}
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lead text-ink">{t('person.notes')}</h2>
          {person.notes.trim() ? (
            <Card>
              <p className="whitespace-pre-wrap text-body text-ink">{person.notes}</p>
            </Card>
          ) : (
            <p className="text-body text-ink-soft">{t('person.noNotes')}</p>
          )}
        </section>

        <section className="space-y-2">
          <VoiceNotesPanel person={person} />
        </section>

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
