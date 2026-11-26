import { useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { useApp } from '../../app/appContext';
import { cn } from './cn';

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  label: string;
  hint?: string;
  optional?: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function TextAreaField({ label, hint, optional, value, onChange, rows = 4, className, ...rest }: TextAreaFieldProps) {
  const { t } = useApp();
  const hintId = useId();
  return (
    <div>
      <label className="block text-body font-semibold text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-soft"> ({t('common.optional')})</span> : null}
        <textarea
          autoComplete="off"
          rows={rows}
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            'mt-2 min-h-tap w-full resize-y rounded-btn border-2 border-edge bg-surface px-4 py-3 text-body font-normal text-ink placeholder:text-ink-soft focus-visible:border-river',
            className,
          )}
        />
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-caption text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
