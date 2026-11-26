import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface ScreenProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** `night` = dark camera screen. */
  tone?: 'paper' | 'night';
  /** Adds room at the bottom for the BottomBar. */
  withBottomBar?: boolean;
}

export function Screen({ children, tone = 'paper', withBottomBar, className, ...rest }: ScreenProps) {
  return (
    <div
      {...rest}
      className={cn(
        'screen',
        tone === 'night' ? 'bg-night text-white' : 'bg-paper text-ink',
        withBottomBar && 'pb-28',
        className,
      )}
    >
      {tone === 'paper' ? (
        // iPhone: keeps scrolled text from sliding under the clock and battery icons.
        // Its height is the status-bar area, which is zero on Android and in a browser.
        <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-30 h-safe-top bg-paper" />
      ) : null}
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
