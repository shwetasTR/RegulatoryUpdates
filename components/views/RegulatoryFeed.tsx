'use client';

import { useMemo, useState } from 'react';
import { RegulatoryChange } from '@/lib/types';
import { bucketByDate, FeedBuckets } from '@/lib/feed-buckets';
import { deriveTopic, Topic } from '@/lib/topics';
import RegulatoryFeedCard from './RegulatoryFeedCard';
import CategoryFilterStrip from './CategoryFilterStrip';

interface RegulatoryFeedProps {
  changes: RegulatoryChange[];
}

interface BucketSection {
  key: keyof FeedBuckets;
  label: string;
  items: RegulatoryChange[];
  collapsibleByDefault?: boolean;
  pinned?: boolean;
}

export default function RegulatoryFeed({ changes }: RegulatoryFeedProps) {
  const [selectedTopics, setSelectedTopics] = useState<Set<Topic>>(new Set());
  const [olderExpanded, setOlderExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (selectedTopics.size === 0) return changes;
    return changes.filter((c) => selectedTopics.has(deriveTopic(c)));
  }, [changes, selectedTopics]);

  const buckets = useMemo(() => bucketByDate(filtered), [filtered]);
  const pinnedIds = useMemo(
    () => new Set(buckets.criticalAndUrgent.map((c) => c.id)),
    [buckets.criticalAndUrgent]
  );

  if (changes.length === 0) {
    return <EmptyState message="All clear! No new regulatory updates at this time." />;
  }

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        <CategoryFilterStrip selected={selectedTopics} onChange={setSelectedTopics} />
        <EmptyState message="No updates match your selected categories. Click 'All' to clear filters." />
      </div>
    );
  }

  const sections: BucketSection[] = [
    {
      key: 'criticalAndUrgent',
      label: 'Critical & Urgent',
      items: buckets.criticalAndUrgent,
      pinned: true,
    },
    { key: 'today', label: 'Today', items: buckets.today },
    { key: 'thisWeek', label: 'This Week', items: buckets.thisWeek },
    { key: 'earlierThisMonth', label: 'Earlier This Month', items: buckets.earlierThisMonth },
    {
      key: 'older',
      label: 'Older',
      items: buckets.older,
      collapsibleByDefault: true,
    },
  ];

  return (
    <div className="space-y-4">
      <CategoryFilterStrip selected={selectedTopics} onChange={setSelectedTopics} />

      {sections.map((section) => {
        if (section.items.length === 0) return null;

        if (section.collapsibleByDefault && !olderExpanded) {
          return (
            <div key={section.key}>
              <button
                type="button"
                onClick={() => setOlderExpanded(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Show {section.items.length} older update{section.items.length === 1 ? '' : 's'} ▾
              </button>
            </div>
          );
        }

        return (
          <section key={section.key} className="space-y-2">
            <h2
              className={`text-sm font-semibold ${
                section.pinned ? 'text-red-400' : 'text-muted-foreground'
              } uppercase tracking-wider`}
            >
              {section.label} {section.items.length > 0 && `(${section.items.length})`}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {section.items.map((change) => (
                <RegulatoryFeedCard
                  key={`${section.key}-${change.id}`}
                  change={change}
                  duplicateOfPinned={!section.pinned && pinnedIds.has(change.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">✅</div>
      <h3 className="text-lg font-semibold mb-2">No Updates</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
    </div>
  );
}
