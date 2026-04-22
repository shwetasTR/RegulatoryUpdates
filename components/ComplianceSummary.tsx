import { FetchUpdatesResponse } from '@/lib/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { isWithin7Days } from '@/lib/utils';

interface ComplianceSummaryProps {
  data: FetchUpdatesResponse;
}

export default function ComplianceSummary({ data }: ComplianceSummaryProps) {
  const { changes } = data;

  // Critical compliance areas
  const sanctionsChanges = changes.filter((c) =>
    c.productModules.includes(3) || // Restricted Party Screening module
    c.title.toLowerCase().match(/sdn|ofac|sanction|denied.*part|entity.*list/i)
  );

  const criticalChanges = changes.filter((c) => c.severity === 'critical');
  const urgentDeadlines = changes.filter(
    (c) => c.effectiveDate && isWithin7Days(c.effectiveDate)
  );
  const highPriority = changes.filter((c) => c.priority === 'P0' || c.priority === 'P1');

  // Risk calculation
  const calculateRiskExposure = () => {
    let exposure = 0;
    criticalChanges.forEach((c) => {
      if (c.priority === 'P0') exposure += 500000; // $500k per critical P0
      else if (c.priority === 'P1') exposure += 250000; // $250k per critical P1
    });
    return exposure;
  };

  const riskExposure = calculateRiskExposure();

  const summaryCards = [
    {
      title: 'Denied Party Screening',
      count: sanctionsChanges.length,
      critical: sanctionsChanges.filter((c) => c.severity === 'critical').length,
      color: sanctionsChanges.length > 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/50',
      icon: sanctionsChanges.length > 0 ? '⚠️' : '✓',
      description: sanctionsChanges.length > 0
        ? `${sanctionsChanges.length} sanctions/screening updates`
        : 'No sanctions updates',
    },
    {
      title: 'Urgent Deadlines',
      count: urgentDeadlines.length,
      critical: urgentDeadlines.filter((c) => c.severity === 'critical').length,
      color: urgentDeadlines.length > 0 ? 'bg-amber-500/10 border-amber-500/50' : 'bg-green-500/10 border-green-500/50',
      icon: urgentDeadlines.length > 0 ? '⏰' : '✓',
      description: urgentDeadlines.length > 0
        ? `${urgentDeadlines.length} items due within 7 days`
        : 'No urgent deadlines',
    },
    {
      title: 'Critical Items',
      count: criticalChanges.length,
      critical: criticalChanges.length,
      color: criticalChanges.length > 0 ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/50',
      icon: criticalChanges.length > 0 ? '🔴' : '✓',
      description: criticalChanges.length > 0
        ? `${criticalChanges.length} critical compliance issues`
        : 'No critical items',
    },
    {
      title: 'High Priority Actions',
      count: highPriority.length,
      critical: highPriority.filter((c) => c.priority === 'P0').length,
      color: highPriority.length > 0 ? 'bg-blue-500/10 border-blue-500/50' : 'bg-green-500/10 border-green-500/50',
      icon: '📋',
      description: `${highPriority.length} P0/P1 items need attention`,
    },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Risk Exposure Banner */}
      {riskExposure > 0 && (
        <Card className="p-4 bg-red-500/5 border-red-500/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-400">
                Estimated Compliance Risk Exposure
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on {criticalChanges.length} unaddressed critical items
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-red-400">
                ${(riskExposure / 1000000).toFixed(1)}M
              </div>
              <div className="text-xs text-muted-foreground">potential fines/penalties</div>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={`p-4 border ${card.color}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-2xl">{card.icon}</div>
              {card.count > 0 && (
                <Badge
                  variant="outline"
                  className={card.critical > 0 ? 'border-red-500/50 text-red-400' : ''}
                >
                  {card.count}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
            <p className="text-xs text-muted-foreground">{card.description}</p>
            {card.critical > 0 && (
              <div className="mt-2 text-xs text-red-400 font-medium">
                {card.critical} Critical
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Denied Party Screening Spotlight */}
      {sanctionsChanges.length > 0 && (
        <Card className="p-4 bg-red-500/5 border-red-500/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h3 className="font-semibold">Denied Party Screening Updates Detected</h3>
          </div>
          <div className="space-y-2">
            {sanctionsChanges.slice(0, 3).map((change) => (
              <div
                key={change.id}
                className="flex items-start gap-3 text-sm bg-background/50 p-3 rounded"
              >
                <Badge
                  className={
                    change.severity === 'critical'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }
                >
                  {change.severity.toUpperCase()}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium mb-1">{change.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Source: {change.source} • Teams: {change.teams.join(', ')}
                  </div>
                </div>
              </div>
            ))}
            {sanctionsChanges.length > 3 && (
              <div className="text-xs text-center text-muted-foreground pt-2">
                +{sanctionsChanges.length - 3} more sanctions updates
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
