import type { RegulatoryChange } from './types';

export type Topic =
  | 'Tariffs & Duties'
  | 'Sanctions / Export Controls'
  | 'Trade Agreements'
  | 'Customs Filing'
  | 'Restricted Parties'
  | 'Country Actions'
  | 'General';

export const TOPICS: readonly Topic[] = [
  'Tariffs & Duties',
  'Sanctions / Export Controls',
  'Trade Agreements',
  'Customs Filing',
  'Restricted Parties',
  'Country Actions',
  'General',
] as const;

const TARIFF_KEYWORDS = [
  'tariff',
  'duty',
  'section 232',
  'section 301',
  'hts',
  'ad/cvd',
  'antidumping',
  'countervailing',
];

const SANCTIONS_KEYWORDS = [
  'sdn',
  'sanction',
  'export control',
  'denied party',
  'entity list',
];

const FTA_KEYWORDS = ['usmca', 'fta', 'trade agreement'];

const CUSTOMS_KEYWORDS = [
  'ace',
  'entry',
  'filing',
  'manifest',
  'ftz',
  'drawback',
  'catair',
];

const RESTRICTED_PARTIES_KEYWORDS = [
  'restricted',
  'forced labor',
  'uflpa',
];

const COUNTRY_KEYWORDS = [
  'china',
  'mexico',
  'canada',
  'european union',
  'eu ',
  'united kingdom',
  ' uk ',
  'japan',
  'korea',
  'russia',
  'iran',
  'india',
  'vietnam',
  'taiwan',
];

function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => lower.includes(n));
}

export function deriveTopic(change: RegulatoryChange): Topic {
  const text = `${change.title} ${change.summary}`;

  // Source-driven rules first (most reliable)
  if (change.source === 'OFAC' || change.source === 'BIS') {
    return 'Sanctions / Export Controls';
  }

  // Strong keyword rules
  if (containsAny(text, SANCTIONS_KEYWORDS)) {
    return 'Sanctions / Export Controls';
  }

  if (containsAny(text, TARIFF_KEYWORDS)) {
    return 'Tariffs & Duties';
  }

  if ((change.ftasAffected?.length ?? 0) > 0 || containsAny(text, FTA_KEYWORDS)) {
    return 'Trade Agreements';
  }

  if (containsAny(text, CUSTOMS_KEYWORDS)) {
    return 'Customs Filing';
  }

  if (containsAny(text, RESTRICTED_PARTIES_KEYWORDS)) {
    return 'Restricted Parties';
  }

  if (change.source === 'WH' && containsAny(text, COUNTRY_KEYWORDS)) {
    return 'Country Actions';
  }

  return 'General';
}

const TOPIC_COLORS: Record<Topic, string> = {
  'Tariffs & Duties': 'bg-amber-500/20 text-amber-400 border-amber-500/50',
  'Sanctions / Export Controls': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  'Trade Agreements': 'bg-sky-500/20 text-sky-400 border-sky-500/50',
  'Customs Filing': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  'Restricted Parties': 'bg-rose-500/20 text-rose-400 border-rose-500/50',
  'Country Actions': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
  General: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

export function topicColor(topic: Topic): string {
  return TOPIC_COLORS[topic];
}
