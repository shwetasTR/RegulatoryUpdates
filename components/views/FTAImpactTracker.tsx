'use client';

import { useState } from 'react';
import { RegulatoryChange } from '@/lib/types';
import { FTA_AGREEMENTS } from '@/lib/constants';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { isWithin7Days, isWithin30Days, formatDate } from '@/lib/utils';

interface FTAImpactTrackerProps {
  changes: RegulatoryChange[];
}

export default function FTAImpactTracker({ changes }: FTAImpactTrackerProps) {
  const [expandedFTA, setExpandedFTA] = useState<string | null>(null);

  const getFTAChanges = (ftaId: string) => {
    return changes
      .filter((c) => c.ftasAffected?.includes(ftaId))
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      });
  };

  const calculateRiskScore = (ftaChanges: RegulatoryChange[]) => {
    let score = 0;
    ftaChanges.forEach((change) => {
      if (change.severity === 'critical') score += 10;
      else if (change.severity === 'high') score += 5;
      else if (change.severity === 'medium') score += 2;
      else score += 1;

      if (change.effectiveDate && isWithin7Days(change.effectiveDate)) score += 5;
      else if (change.effectiveDate && isWithin30Days(change.effectiveDate)) score += 2;
    });
    return score;
  };

  const getRiskLevel = (score: number): { level: string; color: string; icon: string } => {
    if (score === 0) return { level: 'Stable', color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: '✓' };
    if (score <= 10) return { level: 'Low Risk', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: '○' };
    if (score <= 25) return { level: 'Medium Risk', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', icon: '△' };
    return { level: 'High Risk', color: 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse', icon: '⚠' };
  };

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

  const getTopTeams = (ftaChanges: RegulatoryChange[]) => {
    const teamCounts = new Map<string, number>();
    ftaChanges.forEach((change) => {
      change.teams.forEach((team) => {
        teamCounts.set(team, (teamCounts.get(team) || 0) + 1);
      });
    });
    return Array.from(teamCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  };

  // Sort FTAs by risk score
  const sortedFTAs = [...FTA_AGREEMENTS].sort((a, b) => {
    const aChanges = getFTAChanges(a.id);
    const bChanges = getFTAChanges(b.id);
    return calculateRiskScore(bChanges) - calculateRiskScore(aChanges);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedFTAs.map((fta) => {
          const ftaChanges = getFTAChanges(fta.id);
          const riskScore = calculateRiskScore(ftaChanges);
          const risk = getRiskLevel(riskScore);
          const criticalCount = ftaChanges.filter((c) => c.severity === 'critical').length;
          const highCount = ftaChanges.filter((c) => c.severity === 'high').length;
          const urgentCount = ftaChanges.filter((c) => c.effectiveDate && isWithin7Days(c.effectiveDate)).length;
          const topTeams = getTopTeams(ftaChanges);
          const isExpanded = expandedFTA === fta.id;

          return (
            <Card
              key={fta.id}
              className={`p-4 transition-all ${risk.level === 'High Risk' ? 'border-red-500/50' : ''}`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{fta.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{fta.fullName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {fta.status}
                      </Badge>
                      {urgentCount > 0 && (
                        <Badge className="bg-red-500/20 text-red-400 text-xs animate-pulse">
                          {urgentCount} Urgent
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={risk.color}>
                    {risk.icon} {risk.level}
                  </Badge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-lg font-semibold">{ftaChanges.length}</div>
                  </div>
                  {criticalCount > 0 && (
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Critical</div>
                      <div className="text-lg font-semibold text-red-400">{criticalCount}</div>
                    </div>
                  )}
                  {highCount > 0 && (
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">High</div>
                      <div className="text-lg font-semibold text-amber-400">{highCount}</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Risk</div>
                    <div className="text-lg font-semibold">{riskScore}</div>
                  </div>
                </div>

                {/* Top Teams Affected */}
                {topTeams.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">Primary Teams:</div>
                    <div className="flex gap-1 flex-wrap">
                      {topTeams.map(([team, count]) => (
                        <Badge key={team} variant="secondary" className="text-xs">
                          {team} ({count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Changes Preview/Full List */}
                {ftaChanges.length > 0 && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground font-medium">
                        {isExpanded ? 'All Changes:' : 'Top Changes:'}
                      </div>
                      {ftaChanges.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedFTA(isExpanded ? null : fta.id)}
                          className="h-6 text-xs"
                        >
                          {isExpanded ? 'Show Less' : `Show All (${ftaChanges.length})`}
                        </Button>
                      )}
                    </div>
                    {(isExpanded ? ftaChanges : ftaChanges.slice(0, 3)).map((change) => (
                      <div key={change.id} className="text-xs bg-secondary/50 p-2 rounded">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getSeverityColor(change.severity)}>
                            {change.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{change.priority}</Badge>
                          {change.effectiveDate && isWithin7Days(change.effectiveDate) && (
                            <Badge className="bg-red-500/20 text-red-400">
                              Due {formatDate(change.effectiveDate)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-foreground line-clamp-2 mb-1">
                          {change.title}
                        </div>
                        {change.teams.length > 0 && (
                          <div className="text-muted-foreground text-xs">
                            → {change.teams.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {ftaChanges.length === 0 && (
                  <div className="text-center py-4 text-xs text-muted-foreground border-t border-border">
                    ✓ No recent changes - All clear
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
