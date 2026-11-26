import { CameraOff, MicOff } from 'lucide-react';
import { useApp } from '../../app/appContext';
import type { TextKey } from '../../i18n';
import type { DeviceError } from '../../lib/types';
import { EmptyState } from './EmptyState';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';

export interface DeviceProblemProps {
  kind: 'camera' | 'mic';
  error: DeviceError;
  onRetry: () => void;
  onBack: () => void;
}

export function DeviceProblem({ kind, error, onRetry, onBack }: DeviceProblemProps) {
  const { t } = useApp();
  const denied = error === 'denied';
  const titleKey = (denied ? `${kind}.denied.title` : `${kind}.problem.title`) as TextKey;
  const bodyKey = `${kind}.${error}.body` as TextKey;
  return (
    <EmptyState
      role="alert"
      icon={kind === 'camera' ? <CameraOff /> : <MicOff />}
      title={t(titleKey)}
      body={t(bodyKey)}
      action={
        <>
          <PrimaryButton onClick={onRetry}>{t('common.tryAgain')}</PrimaryButton>
          <SecondaryButton onClick={onBack}>{t('common.back')}</SecondaryButton>
        </>
      }
    />
  );
}
