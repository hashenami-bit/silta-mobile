import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-purple-700 text-white px-6">
          <AlertCircle className="w-16 h-16 mb-4 text-red-300" />
          <h1 className="text-3xl font-bold mb-2">Something went wrong</h1>
          <p className="text-purple-200 text-center max-w-md mb-2">
            The app encountered an unexpected error.
          </p>
          <p className="text-purple-300 text-sm text-center max-w-md mb-6 font-mono">
            {this.state.error?.message}
          </p>
          <div className="flex gap-4">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold px-6 py-3 rounded-full transition"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white font-semibold px-6 py-3 rounded-full transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
