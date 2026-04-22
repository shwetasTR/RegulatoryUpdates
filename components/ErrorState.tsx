import { Button } from './ui/button';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">⚠️</div>
        <h2 className="text-2xl font-semibold">Connection Failed</h2>
        <p className="text-muted-foreground">
          Could not reach regulatory data sources. Check your network connection.
        </p>
        <p className="text-sm text-red-400">{error}</p>
        <Button onClick={onRetry} className="mt-4">
          Retry
        </Button>
      </div>
    </div>
  );
}
