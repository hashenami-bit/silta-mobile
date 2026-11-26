import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useApp } from '../../app/appContext';
import { Panel, PrimaryButton, SecondaryButton } from '../../components/ui';

export type SaveState = 'saving' | 'saved' | 'failed';

interface Props {
  name: string;
  state: SaveState;
  onFinish: () => void;
  onAnother: () => void;
  onRetry: () => void;
  onBackToVoice: () => void;
}

export function SavedStep({ name, state, onFinish, onAnother, onRetry, onBackToVoice }: Props) {
  const { t } = useApp();

  if (state === 'saving') {
    return (
      <p role="status" className="py-16 text-center font-display text-title text-ink">
        {t('common.loading')}
      </p>
    );
  }

  if (state === 'failed') {
    return (
      <div className="space-y-4 py-8">
        <div aria-hidden="true" className="flex justify-center text-river [&>svg]:h-14 [&>svg]:w-14">
          <TriangleAlert />
        </div>
        <Panel tone="lantern" role="alert">
          {t('error.saveFailed')}
        </Panel>
        <PrimaryButton onClick={onRetry}>{t('common.tryAgain')}</PrimaryButton>
        <SecondaryButton onClick={onBackToVoice}>{t('common.back')}</SecondaryButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div aria-hidden="true" className="text-river [&>svg]:h-16 [&>svg]:w-16">
        <CircleCheck />
      </div>
      <h2 className="font-display text-title text-ink">{t('add.saved.title')}</h2>
      <p className="text-body text-ink-soft">{t('add.saved.body', { name })}</p>
      <div className="w-full space-y-3 pt-4">
        <PrimaryButton onClick={onFinish}>{t('add.saved.finish')}</PrimaryButton>
        <SecondaryButton onClick={onAnother}>{t('add.saved.another')}</SecondaryButton>
      </div>
    </div>
  );
}
