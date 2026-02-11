import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface LoadingScreenProps {
  error?: string | null;
  isRetrying?: boolean;
  onRetry?: () => void;
}

export const LoadingScreen = ({ error, isRetrying, onRetry }: LoadingScreenProps) => {
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-purple-700 text-white px-6">
        <AlertCircle className="w-12 h-12 mb-4 text-red-300" />
        <h2 className="text-2xl font-bold mb-2">Failed to Load</h2>
        <p className="text-purple-200 mt-2 text-center max-w-md">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-6 flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold px-6 py-3 rounded-full transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-purple-700 text-white">
      <Loader2 className="w-12 h-12 animate-spin mb-4" />
      <h2 className="text-2xl font-bold">Loading AI Models...</h2>
      <p className="text-purple-200 mt-2">Please wait a moment</p>
    </div>
  );
};
