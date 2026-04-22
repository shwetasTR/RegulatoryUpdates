import { RegulatoryChange } from '@/lib/types';
import { PRODUCT_MODULES } from '@/lib/constants';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { getCountdown } from '@/lib/utils';

interface TeamActionBoardProps {
  changes: RegulatoryChange[];
}

export default function TeamActionBoard({ changes }: TeamActionBoardProps) {
  const teams = Array.from(new Set(changes.flatMap((c) => c.teams))).sort();

  const getTeamChanges = (team: string) => {
    return changes
      .filter((c) => c.teams.includes(team))
      .sort((a, b) => {
        const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'P1':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'P2':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'P3':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return '';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'S':
        return 'bg-green-500/20 text-green-400';
      case 'M':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'L':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {teams.map((team) => {
        const teamChanges = getTeamChanges(team);
        const teamModules = Object.values(PRODUCT_MODULES).filter((m) => m.team === team);
        const timezones = teamModules[0]?.timezones || [];

        return (
          <Card key={team} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{team}</h3>
                <div className="text-xs text-muted-foreground mt-1">
                  {teamModules.map((m) => m.name).join(', ')}
                  {timezones.length > 0 && (
                    <span className="ml-2">• {timezones.join(', ')}</span>
                  )}
                </div>
              </div>
              <Badge variant="outline">{teamChanges.length} actions</Badge>
            </div>

            <div className="space-y-2">
              {teamChanges.slice(0, 10).map((change) => (
                <div
                  key={change.id}
                  className="border border-border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={getPriorityColor(change.priority)}>
                          {change.priority}
                        </Badge>
                        <Badge className={getEffortColor(change.effort)}>
                          {change.effort}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {change.actionType}
                        </span>
                      </div>
                      <div className="text-sm font-medium mb-1 truncate">
                        {change.title}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {change.summary}
                      </div>
                    </div>
                    {change.effectiveDate && (
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">Due</div>
                        <div className="text-sm font-medium">
                          {getCountdown(change.effectiveDate)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {teamChanges.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No pending actions
                </div>
              )}
              {teamChanges.length > 10 && (
                <div className="text-center pt-2 text-xs text-muted-foreground">
                  +{teamChanges.length - 10} more actions
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {teams.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold mb-2">No Team Actions</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No pending actions for any teams. Great work staying on top of compliance!
          </p>
        </div>
      )}
    </div>
  );
}
