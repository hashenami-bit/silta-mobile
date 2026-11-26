import { useApp } from '../../app/appContext';

export interface LevelMeterProps {
  /** 0 (silent) to 1 (loud). */
  level: number;
}

export function LevelMeter({ level }: LevelMeterProps) {
  const { t } = useApp();
  const safe = Math.min(1, Math.max(0, Number.isFinite(level) ? level : 0));
  const pct = Math.round(Math.min(1, Math.sqrt(safe) * 1.6) * 100);
  return (
    <div
      role="meter"
      aria-label={t('mic.level')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-4 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div className="h-full rounded-full bg-river transition-[width] duration-100" style={{ width: `${pct}%` }} />
    </div>
  );
}
