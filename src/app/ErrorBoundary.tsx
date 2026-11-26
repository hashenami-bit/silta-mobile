// Catches unexpected screen crashes and shows a calm message instead of a blank page.
// Owned by the main session.

import { Component } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LANG, translate } from '../i18n';
import { AppContext } from './appContext';

interface Props {
  children: ReactNode;
}

interface State {
  crashed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  static contextType = AppContext;
  declare context: React.ContextType<typeof AppContext>;

  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    const lang = this.context?.lang ?? DEFAULT_LANG;
    return (
      <div className="screen flex flex-col items-center justify-center gap-4 bg-paper px-5 text-center" role="alert">
        <h1 className="font-display text-title text-ink">{translate(lang, 'error.title')}</h1>
        <p className="text-body text-ink-soft">{translate(lang, 'error.generic')}</p>
        <button
          type="button"
          className="inline-flex min-h-tap w-full max-w-sm items-center justify-center rounded-btn bg-river px-6 py-3 text-lead font-semibold text-white"
          onClick={() => window.location.reload()}
        >
          {translate(lang, 'common.tryAgain')}
        </button>
      </div>
    );
  }
}
