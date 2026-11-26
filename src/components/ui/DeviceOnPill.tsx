import { useApp } from '../../app/appContext';

export interface DeviceOnPillProps {
  kind: 'camera' | 'mic';
  className?: string;
}

export function DeviceOnPill({ kind, className }: DeviceOnPillProps) {
  const { t } = useApp();
  return (
    <span
      className={`inline-flex min-h-10 items-center gap-2 rounded-full bg-night/70 px-4 py-2 text-caption font-semibold text-white${className ? ` ${className}` : ''}`}
    >
      <span aria-hidden="true" className="h-3 w-3 rounded-full bg-lantern" />
      {kind === 'camera' ? t('camera.on') : t('mic.on')}
    </span>
  );
}
