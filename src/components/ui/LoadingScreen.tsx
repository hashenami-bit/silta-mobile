import { useApp } from '../../app/appContext';
import { PrimaryButton } from './PrimaryButton';
import { Screen } from './Screen';

export interface LoadingScreenProps {
  failed?: boolean;
  onRetry?: () => void;
}

export function LoadingScreen({ failed, onRetry }: LoadingScreenProps) {
  const { t } = useApp();
  return (
    <Screen className="flex min-h-screen items-center justify-center">
      <div className="px-5 text-center">
        <h1 className="font-display text-display text-river">{t('app.name')}</h1>
        <p className="mt-2 text-lead text-ink-soft">{t('app.tagline')}</p>
        {failed ? (
          <div role="alert" className="mt-8 space-y-4">
            <p className="text-body text-ink">{t('app.loadFailed')}</p>
            {onRetry ? <PrimaryButton onClick={onRetry}>{t('common.tryAgain')}</PrimaryButton> : null}
          </div>
        ) : (
          <p role="status" className="mt-8 text-body text-ink-soft">
            {t('app.loading')}
          </p>
        )}
      </div>
    </Screen>
  );
}
