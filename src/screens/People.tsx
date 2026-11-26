import { ChevronRight, Plus, Users } from 'lucide-react';
import { useApp } from '../app/appContext';
import { BottomBar, Card, EmptyState, PersonAvatar, PrimaryButton, Screen } from '../components/ui';
import { kinshipLabel } from '../i18n';

export function PeopleScreen() {
  const { t, lang, people, navigate } = useApp();
  const addPerson = () => navigate({ name: 'addPerson' });

  return (
    <Screen withBottomBar className={people.length > 0 ? 'pb-48' : undefined}>
      <header className="pt-safe px-5 pb-3 pt-6">
        <h1 className="font-display text-title text-ink">{t('people.title')}</h1>
      </header>
      <main className="px-5">
        {people.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={t('people.empty.title')}
            body={t('people.empty.body')}
            action={<PrimaryButton icon={<Plus />} onClick={addPerson}>{t('people.add')}</PrimaryButton>}
          />
        ) : (
          <ul className="space-y-3">
            {people.map((p) => (
              <li key={p.id}>
                <Card
                  as="button"
                  aria-label={t('people.open', { name: p.name })}
                  onClick={() => navigate({ name: 'person', personId: p.id })}
                >
                  <PersonAvatar person={p} size="list" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lead font-semibold text-ink">{p.name}</span>
                    <span className="block truncate text-body text-ink-soft">{kinshipLabel(lang, p.kinship)}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="shrink-0 text-ink-soft" />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
      {people.length > 0 ? (
        <div className="fixed inset-x-0 bottom-bar z-10 bg-paper/95 px-5 py-3">
          <div className="mx-auto max-w-md">
            <PrimaryButton icon={<Plus />} onClick={addPerson}>{t('people.add')}</PrimaryButton>
          </div>
        </div>
      ) : null}
      <BottomBar />
    </Screen>
  );
}
