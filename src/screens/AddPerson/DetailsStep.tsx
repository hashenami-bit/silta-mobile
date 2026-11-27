import { useApp } from '../../app/appContext';
import { Card, ChoiceTile, Field } from '../../components/ui';
import { KINSHIP_KEYS, introduce, kinshipLabel } from '../../i18n';
import { NOTES } from '../../lib/config';
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
      <div>
        <Field
          label={t('add.whoLine.label')}
          hint={t('add.whoLine.hint')}
          optional
          maxLength={NOTES.whoLineMaxChars}
          value={draft.whoLine}
          onChange={(v) => update({ whoLine: v.slice(0, NOTES.whoLineMaxChars) })}
        />
        <p className="mt-1 text-caption text-ink-soft">
          {t('add.whoLine.count', { count: draft.whoLine.length, max: NOTES.whoLineMaxChars })}
        </p>
      </div>
      {name ? (
        <Card>
          <p className="text-caption font-semibold text-ink-soft">{t('add.preview')}</p>
          <p className="mt-1 font-display text-title text-ink">{introduce(lang, name, kinshipOf(draft))}</p>
          {draft.whoLine.trim() ? <p className="mt-2 break-words text-lead text-ink">{draft.whoLine.trim()}</p> : null}
        </Card>
      ) : null}
      <div className="space-y-4">
        <div>
          <h3 className="font-display text-lead text-ink">{t('add.more.title')}</h3>
          <p className="mt-1 text-caption text-ink-soft">{t('add.more.hint')}</p>
        </div>
        <Field
          label={t('add.birthday.label')}
          optional
          type="date"
          value={draft.birthday}
          onChange={(v) => update({ birthday: v })}
        />
        <Field
          label={t('add.phone.label')}
          optional
          type="tel"
          inputMode="tel"
          maxLength={20}
          placeholder={t('add.phone.placeholder')}
          value={draft.phone}
          onChange={(v) => update({ phone: v })}
        />
        <Field
          label={t('add.city.label')}
          optional
          maxLength={60}
          placeholder={t('add.city.placeholder')}
          value={draft.city}
          onChange={(v) => update({ city: v })}
        />
      </div>
    </div>
  );
}
