import { RegulatoryChange } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { formatDate, isWithin7Days } from '@/lib/utils';

interface DeniedPartyScreeningProps {
  changes: RegulatoryChange[];
}

export default function DeniedPartyScreening({ changes }: DeniedPartyScreeningProps) {
  // Filter for denied party screening related changes
  const dpsChanges = changes.filter((c) =>
    c.productModules.includes(3) || // Restricted Party Screening module
    c.source === 'OFAC' ||
    c.title.toLowerCase().match(/sdn|ofac|sanction|denied.*part|entity.*list|blocked.*person|embargo/i)
  );

  const sortedChanges = [...dpsChanges].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });

  const criticalCount = sortedChanges.filter((c) => c.severity === 'critical').length;
  const highCount = sortedChanges.filter((c) => c.severity === 'high').length;
  const urgentCount = sortedChanges.filter((c) => c.effectiveDate && isWithin7Days(c.effectiveDate)).length;

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
      case 'OFAC':
        return 'bg-purple-500/20 text-purple-400';
      case 'CSMS':
        return 'bg-green-500/20 text-green-400';
      case 'WH':
        return 'bg-pink-500/20 text-pink-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getListType = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('sdn')) return 'SDN List';
    if (lower.includes('entity list')) return 'Entity List';
    if (lower.includes('denied person')) return 'Denied Persons List';
    if (lower.includes('military end')) return 'Military End User List';
    if (lower.includes('unverified')) return 'Unverified List';
    return 'Sanctions';
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-red-500/5 border-red-500/50">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{sortedChanges.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Total DPS Updates</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{criticalCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Critical</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-400">{highCount}</div>
            <div className="text-xs text-muted-foreground mt-1">High Priority</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{urgentCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Urgent (&lt; 7 days)</div>
          </div>
        </Card>
      </div>

      {/* DPS Updates List */}
      <div className="space-y-4">
        {sortedChanges.map((change) => (
          <Card
            key={change.id}
            className={`p-5 transition-all hover:bg-accent/30 ${
              change.severity === 'critical' ? 'border-red-500/50 bg-red-500/5' : ''
            }`}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge className={getSeverityColor(change.severity)}>
                      {change.severity.toUpperCase()}
                    </Badge>
                    <Badge className={getSourceColor(change.source)}>
                      {change.source}
                    </Badge>
                    <Badge variant="outline">{getListType(change.title)}</Badge>
                    {change.effectiveDate && isWithin7Days(change.effectiveDate) && (
                      <Badge className="bg-red-500/20 text-red-400 animate-pulse">
                        ⚠️ Urgent - Due {formatDate(change.effectiveDate)}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 leading-tight">
                    {change.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {change.summary}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">Published</div>
                  <div className="text-sm font-medium">{formatDate(change.publishDate)}</div>
                  {change.effectiveDate && (
                    <>
                      <div className="text-xs text-muted-foreground mt-2">Effective</div>
                      <div className="text-sm font-medium text-amber-400">
                        {formatDate(change.effectiveDate)}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Metadata Row */}
              <div className="flex items-center justify-between pt-3 border-t border-border text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-muted-foreground">Priority:</span>{' '}
                    <Badge
                      variant="outline"
                      className={
                        change.priority === 'P0' || change.priority === 'P1'
                          ? 'border-red-500/50 text-red-400'
                          : ''
                      }
                    >
                      {change.priority}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Effort:</span>{' '}
                    <Badge variant="outline">{change.effort}</Badge>
                  </div>
                </div>
                {change.url && (
                  <a
                    href={change.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Official Document →
                  </a>
                )}
              </div>

              {/* Teams */}
              {change.teams.length > 0 && (
                <div className="flex items-center gap-2 text-xs pt-3 border-t border-border">
                  <span className="text-muted-foreground font-medium">Assigned Teams:</span>
                  <div className="flex gap-1 flex-wrap">
                    {change.teams.map((team) => (
                      <Badge key={team} variant="secondary" className="text-xs">
                        {team}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Required */}
              {change.severity === 'critical' && (
                <div className="pt-3 border-t border-border">
                  <div className="bg-red-500/10 border border-red-500/50 rounded p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 text-lg">⚠️</span>
                      <div className="flex-1">
                        <div className="font-semibold text-red-400 text-sm mb-1">
                          Immediate Action Required
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Critical sanctions update - update screening databases immediately to prevent compliance violations.
                          Notify {change.teams.join(', ')} teams.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {sortedChanges.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold mb-2">No Denied Party Screening Updates</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            All clear! No new SDN, Entity List, or sanctions updates detected.
            Your screening databases are up to date.
          </p>
        </div>
      )}
    </div>
  );
}
