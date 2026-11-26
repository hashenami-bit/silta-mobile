import { useApp } from '../../app/appContext';
import { Checkbox, Field, Panel } from '../../components/ui';
import type { Draft, DraftUpdater } from './draft';

interface Props {
  draft: Draft;
  update: DraftUpdater;
  showNeedAll: boolean;
}

export function ConsentStep({ draft, update, showNeedAll }: Props) {
  const { t } = useApp();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-title text-ink">{t('add.consent.title')}</h2>
        <p className="mt-2 text-body text-ink-soft">{t('add.consent.intro')}</p>
      </div>
      <Field
        label={t('add.consent.caregiver')}
        hint={t('add.consent.caregiverHint')}
        value={draft.caregiverName}
        onChange={(caregiverName) => update({ caregiverName })}
        autoComplete="off"
      />
      <div className="space-y-3">
        <Checkbox
          label={t('add.consent.check.caregiver')}
          checked={draft.agreedCaregiver}
          onChange={(agreedCaregiver) => update({ agreedCaregiver })}
        />
        <Checkbox
          label={t('add.consent.check.person')}
          checked={draft.agreedPerson}
          onChange={(agreedPerson) => update({ agreedPerson })}
        />
      </div>
      <Panel tone="river">{t('privacy.short')}</Panel>
      {showNeedAll ? (
        <Panel tone="lantern" role="status">
          {t('add.consent.needAll')}
        </Panel>
      ) : null}
    </div>
  );
}
