import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level React error boundary.
 *
 * Without this, any uncaught exception in a child component blanks
 * the entire app to a white screen — bad UX and worse for trust.
 * This catches the error, logs it (so it shows up in browser dev
 * tools and any future error-tracking provider), and renders a
 * branded fallback with a "Reload" button.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    /* eslint-disable-next-line no-console */
    console.error('[FlyttGo] Uncaught error:', error, info.componentStack);
    /* TODO: forward to Sentry / Logsnag / your error tracker once one is wired up. */
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  handleHome = () => {
    if (typeof window !== 'undefined') window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-elevated border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-danger-50 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-4 ring-danger-600/10">
            <svg className="w-7 h-7 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5C3.498 18.333 4.46 20 6 20z" />
            </svg>
          </div>
          <h1 className="text-xl font-extrabold text-ink-900 mb-2">Something went wrong</h1>
          <p className="text-slate-500 text-sm mb-1">
            FlyttGo ran into an unexpected error. Reloading the page should fix it.
          </p>
          {this.state.error?.message && (
            <details className="text-xs text-slate-400 font-mono mt-3 mb-5 text-left bg-surface-soft border border-slate-200 rounded-lg px-3 py-2">
              <summary className="cursor-pointer text-slate-500">Technical detail</summary>
              <p className="break-words mt-1">{this.state.error.message}</p>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={this.handleReload}
              className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-ink-900 rounded-xl font-bold transition-base ease-marketplace shadow-soft"
            >
              Reload
            </button>
            <button
              onClick={this.handleHome}
              className="flex-1 py-2.5 border border-slate-300 text-slate-700 hover:border-ink-900 hover:text-ink-900 rounded-xl font-bold transition-base ease-marketplace"
            >
              Back to home
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-6">
            If this keeps happening, contact <a href="mailto:support@flyttgo.us" className="text-brand-600 hover:underline">support@flyttgo.us</a>.
          </p>
        </div>
      </div>
    );
  }
}
