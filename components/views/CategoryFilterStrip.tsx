'use client';

import { Topic } from '@/lib/topics';

interface CategoryFilterStripProps {
  selected: Set<Topic>;
  onChange: (next: Set<Topic>) => void;
}

const FILTERABLE_TOPICS: Topic[] = [
  'Tariffs & Duties',
  'Sanctions / Export Controls',
  'Trade Agreements',
  'Customs Filing',
  'Restricted Parties',
  'Country Actions',
];

const SHORT_LABELS: Record<Topic, string> = {
  'Tariffs & Duties': 'Tariffs',
  'Sanctions / Export Controls': 'Sanctions',
  'Trade Agreements': 'FTAs',
  'Customs Filing': 'Customs',
  'Restricted Parties': 'Restricted Parties',
  'Country Actions': 'Country Actions',
  General: 'General',
};

export default function CategoryFilterStrip({ selected, onChange }: CategoryFilterStripProps) {
  const allActive = selected.size === 0;

  function toggle(topic: Topic) {
    const next = new Set(selected);
    if (next.has(topic)) {
      next.delete(topic);
    } else {
      next.add(topic);
    }
    onChange(next);
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div className="flex items-center gap-2 flex-wrap pb-3 mb-3 border-b border-border">
      <button
        type="button"
        onClick={clearAll}
        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
          allActive
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-border text-muted-foreground hover:bg-accent'
        }`}
      >
        All
      </button>
      {FILTERABLE_TOPICS.map((topic) => {
        const active = selected.has(topic);
        return (
          <button
            key={topic}
            type="button"
            onClick={() => toggle(topic)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              active
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            {SHORT_LABELS[topic]}
          </button>
        );
      })}
    </div>
  );
}
