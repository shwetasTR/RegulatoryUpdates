import { RegulatoryChange } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { formatDate, isWithin7Days, isWithin30Days } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface RegulatoryFeedProps {
  changes: RegulatoryChange[];
}

export default function RegulatoryFeed({ changes }: RegulatoryFeedProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const sortedChanges = [...changes].sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'medium':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'low':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return '';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'CSMS':
        return 'bg-green-500/20 text-green-400';
      case 'WH':
        return 'bg-pink-500/20 text-pink-400';
      case 'OFAC':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getRecencyBadge = (publishDate: string) => {
    const hoursSincePublish = (currentTime - new Date(publishDate).getTime()) / (1000 * 60 * 60);
    if (hoursSincePublish < 24) {
      return <Badge className="bg-green-500/20 text-green-400 animate-pulse">New</Badge>;
    }
    if (isWithin7Days(publishDate)) {
      return <Badge className="bg-green-500/20 text-green-400">New</Badge>;
    }
    if (isWithin30Days(publishDate)) {
      return <Badge className="bg-blue-500/20 text-blue-400">Recent</Badge>;
    }
    return null;
  };

  const getUrgencyBadge = (effectiveDate?: string) => {
    if (!effectiveDate) return null;
    if (isWithin7Days(effectiveDate)) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">⚠️ Urgent</Badge>;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {sortedChanges.map((change) => (
        <Card
          key={change.id}
          className={`p-4 hover:bg-accent/50 transition-colors ${
            change.severity === 'critical' ? 'border-red-500/50 animate-pulse-slow' : ''
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getSeverityColor(change.severity)}>
                  {change.severity.toUpperCase()}
                </Badge>
                <Badge className={getSourceColor(change.source)}>
                  {change.source}
                </Badge>
                {getRecencyBadge(change.publishDate)}
                {getUrgencyBadge(change.effectiveDate)}
              </div>
              <div className="text-xs text-muted-foreground text-right shrink-0">
                {formatDate(change.publishDate)}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-1 leading-tight">
                {change.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {change.summary}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Priority:</span>
                <Badge
                  variant="outline"
                  className={
                    change.priority === 'P0' || change.priority === 'P1'
                      ? 'border-amber-500/50 text-amber-400'
                      : ''
                  }
                >
                  {change.priority}
                </Badge>
                <Badge variant="outline" className="ml-1">
                  {change.effort}
                </Badge>
              </div>
              {change.effectiveDate && (
                <div className="text-muted-foreground">
                  Effective: {formatDate(change.effectiveDate)}
                </div>
              )}
            </div>

            {change.teams.length > 0 && (
              <div className="flex items-center gap-2 text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">Teams:</span>
                <div className="flex gap-1 flex-wrap">
                  {change.teams.map((team) => (
                    <Badge key={team} variant="secondary" className="text-xs">
                      {team}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {change.url && (
              <div className="pt-2 border-t border-border">
                <a
                  href={change.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View official document →
                </a>
              </div>
            )}
          </div>
        </Card>
      ))}

      {sortedChanges.length === 0 && (
        <div className="col-span-2 text-center py-16">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold mb-2">No Changes Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {changes.length === 0
              ? "All clear! No new regulatory updates at this time. Check back soon for the latest trade compliance changes."
              : "No matches for your search. Try different keywords or clear the search filter."}
          </p>
        </div>
      )}
    </div>
  );
}
