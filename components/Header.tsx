import { FetchUpdatesResponse } from '@/lib/types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

interface HeaderProps {
  data: FetchUpdatesResponse;
  onRefresh: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export default function Header({ data, onRefresh, onSearch, searchQuery }: HeaderProps) {
  const [timeAgo, setTimeAgo] = useState(() => {
    const seconds = Math.floor((Date.now() - new Date(data.timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  });

  useEffect(() => {
    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - new Date(data.timestamp).getTime()) / 1000);
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    };

    const interval = setInterval(() => setTimeAgo(updateTimeAgo()), 10000);
    return () => clearInterval(interval);
  }, [data.timestamp]);

  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Regulatory Intelligence Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily intelligence on US trade policy — what&apos;s critical, what&apos;s effective soon, and who owns the response.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={data.status === 'success' ? 'default' : 'secondary'}>
            {data.dataSource === 'tr-claude' ? '🤖 Claude' : '📊 Fallback'}
          </Badge>
          <div className="text-right text-sm">
            <div className="font-medium">{data.changes.length} Changes</div>
            <div className="text-muted-foreground">
              {data.metadata.criticalCount} Critical
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search changes by title, summary, or source..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full px-4 py-2 bg-secondary border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Updated {timeAgo}
          </span>
          <Button onClick={onRefresh} variant="outline" size="sm">
            🔄 Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}
