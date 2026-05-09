'use client';

import { RegulatoryChange } from '@/lib/types';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { formatDate, daysUntil, getCountdown } from '@/lib/utils';
import { deriveTopic, topicColor } from '@/lib/topics';

interface RegulatoryFeedCardProps {
  change: RegulatoryChange;
  /** When true, render a small "(also above)" muted note. Used to mark a card
   *  duplicated into a date bucket from the Critical & Urgent section. */
  duplicateOfPinned?: boolean;
}

const MAX_MODULES_SHOWN = 3;

export default function RegulatoryFeedCard({
  change,
  duplicateOfPinned = false,
}: RegulatoryFeedCardProps) {
  const topic = deriveTopic(change);
  const isCritical = change.severity === 'critical' || change.priority === 'P0';
  const effectiveDays = change.effectiveDate ? daysUntil(change.effectiveDate) : null;
  const isTimeUrgent = effectiveDays !== null && effectiveDays >= 0 && effectiveDays <= 7;

  const visibleModules = change.productModules.slice(0, MAX_MODULES_SHOWN);
  const overflowModules = change.productModules.length - visibleModules.length;

  return (
    <Card
      className={`p-4 hover:bg-accent/50 transition-colors ${
        isCritical ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${topicColor(topic)} border`}>{topic}</Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {sourceLabel(change.source)}
            </Badge>
            {isCritical && (
              <Badge className="bg-red-500/20 text-red-400 border border-red-500/50">
                Critical
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground text-right shrink-0">
            {formatDate(change.publishDate)}
            {duplicateOfPinned && (
              <div className="italic text-muted-foreground/70">(also pinned)</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{change.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{change.summary}</p>
        </div>

        {isTimeUrgent && change.effectiveDate && (
          <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
            ⚠ Effective {getCountdown(change.effectiveDate).toLowerCase()}
          </Badge>
        )}

        {(visibleModules.length > 0 || change.effectiveDate) && (
          <div className="flex items-center justify-between text-xs pt-2 border-t border-border gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              {visibleModules.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  Module {m}
                </Badge>
              ))}
              {overflowModules > 0 && (
                <span className="text-muted-foreground">+{overflowModules} more</span>
              )}
            </div>
            {change.effectiveDate && !isTimeUrgent && (
              <div className="text-muted-foreground shrink-0">
                Effective {formatDate(change.effectiveDate)}
              </div>
            )}
          </div>
        )}

        {change.url && (
          <div className="pt-1">
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
  );
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'CSMS':
      return 'CBP CSMS';
    case 'WH':
      return 'White House';
    case 'OFAC':
      return 'OFAC';
    case 'USTR':
      return 'USTR';
    case 'BIS':
      return 'BIS';
    default:
      return source;
  }
}
