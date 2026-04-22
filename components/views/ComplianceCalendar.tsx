import { RegulatoryChange } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { formatDate, getCountdown, isWithin7Days, isWithin30Days, isWithin90Days } from '@/lib/utils';

interface ComplianceCalendarProps {
  changes: RegulatoryChange[];
}

export default function ComplianceCalendar({ changes }: ComplianceCalendarProps) {
  const upcomingChanges = changes
    .filter((c) => c.effectiveDate)
    .sort((a, b) => {
      if (!a.effectiveDate || !b.effectiveDate) return 0;
      return new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime();
    });

  const within7Days = upcomingChanges.filter((c) => c.effectiveDate && isWithin7Days(c.effectiveDate));
  const within30Days = upcomingChanges.filter(
    (c) => c.effectiveDate && isWithin30Days(c.effectiveDate) && !isWithin7Days(c.effectiveDate)
  );
  const within90Days = upcomingChanges.filter(
    (c) => c.effectiveDate && isWithin90Days(c.effectiveDate) && !isWithin30Days(c.effectiveDate)
  );
  const beyond90Days = upcomingChanges.filter(
    (c) => c.effectiveDate && !isWithin90Days(c.effectiveDate)
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

  const renderChangeCard = (change: RegulatoryChange) => (
    <div
      key={change.id}
      className="border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className={getSeverityColor(change.severity)}>
              {change.severity.toUpperCase()}
            </Badge>
            <Badge variant="outline">{change.priority}</Badge>
          </div>
          <div className="text-sm font-medium mb-1">{change.title}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">
            {change.summary}
          </div>
        </div>
        {change.effectiveDate && (
          <div className="text-right shrink-0">
            <div className="text-sm font-semibold text-primary">
              {getCountdown(change.effectiveDate)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(change.effectiveDate)}
            </div>
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
    </div>
  );

  return (
    <div className="space-y-6">
      {within7Days.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold">Next 7 Days</h3>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              {within7Days.length} deadlines
            </Badge>
          </div>
          <div className="space-y-2">{within7Days.map(renderChangeCard)}</div>
        </div>
      )}

      {within30Days.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold">Next 30 Days</h3>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
              {within30Days.length} deadlines
            </Badge>
          </div>
          <div className="space-y-2">{within30Days.map(renderChangeCard)}</div>
        </div>
      )}

      {within90Days.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold">Next 90 Days</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
              {within90Days.length} deadlines
            </Badge>
          </div>
          <div className="space-y-2">{within90Days.map(renderChangeCard)}</div>
        </div>
      )}

      {beyond90Days.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold">Beyond 90 Days</h3>
            <Badge variant="outline">{beyond90Days.length} deadlines</Badge>
          </div>
          <Card className="p-4">
            <div className="space-y-2">
              {beyond90Days.slice(0, 5).map((change) => (
                <div key={change.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1 truncate">{change.title}</div>
                  {change.effectiveDate && (
                    <div className="text-xs text-muted-foreground ml-2 shrink-0">
                      {formatDate(change.effectiveDate)}
                    </div>
                  )}
                </div>
              ))}
              {beyond90Days.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  +{beyond90Days.length - 5} more deadlines
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {upcomingChanges.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-lg font-semibold mb-2">No Upcoming Deadlines</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your compliance calendar is clear. No regulatory deadlines on the horizon!
          </p>
        </div>
      )}
    </div>
  );
}
