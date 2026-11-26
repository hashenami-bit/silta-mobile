import { cn } from './cn';

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ label, checked, onChange, disabled, className }: CheckboxProps) {
  return (
    <label
      className={cn(
        'flex min-h-tap w-full items-center gap-3 rounded-btn bg-surface px-4 py-2 text-body text-ink',
        disabled && 'opacity-50',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 shrink-0 accent-river"
      />
      <span className="min-w-0 flex-1">{label}</span>
    </label>
  );
}
