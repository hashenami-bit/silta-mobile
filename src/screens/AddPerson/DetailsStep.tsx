import { useApp } from '../../app/appContext';
import { Card, ChoiceTile, Field, TextAreaField } from '../../components/ui';
import { KINSHIP_KEYS, introduce, kinshipLabel } from '../../i18n';
import { kinshipOf } from './draft';
import type { Draft, DraftUpdater } from './draft';

interface Props {
  draft: Draft;
  update: DraftUpdater;
}

export function DetailsStep({ draft, update }: Props) {
  const { t, lang } = useApp();
  const name = draft.name.trim();
  return (
    <div className="space-y-6">
      <h2 className="font-display text-title text-ink">{t('add.details.title')}</h2>
      <Field
        label={t('add.name.label')}
        placeholder={t('add.name.placeholder')}
        value={draft.name}
        onChange={(v) => update({ name: v })}
        autoComplete="off"
      />
      <div>
        <p className="text-body font-semibold text-ink">{t('add.kinship.label')}</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {KINSHIP_KEYS.map((key) => (
            <ChoiceTile
              key={key}
              selected={draft.kinChoice === key}
              onSelect={() => update({ kinChoice: key })}
            >
              {kinshipLabel(lang, { preset: key, custom: '' })}
            </ChoiceTile>
          ))}
          <ChoiceTile selected={draft.kinChoice === 'other'} onSelect={() => update({ kinChoice: 'other' })}>
            {t('add.kinship.other')}
          </ChoiceTile>
        </div>
      </div>
      {draft.kinChoice === 'other' ? (
        <Field
          label={t('add.kinship.otherLabel')}
          placeholder={t('add.kinship.otherPlaceholder')}
          value={draft.kinCustom}
          onChange={(v) => update({ kinCustom: v })}
        />
      ) : null}
      <TextAreaField
        label={t('add.note.label')}
        hint={t('add.note.hint')}
        optional
        value={draft.notes}
        onChange={(v) => update({ notes: v })}
      />
      {name ? (
        <Card>
          <p className="text-caption font-semibold text-ink-soft">{t('add.preview')}</p>
          <p className="mt-1 font-display text-title text-ink">{introduce(lang, name, kinshipOf(draft))}</p>
        </Card>
      ) : null}
    </div>
  );
}
