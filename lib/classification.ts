import { PRODUCT_MODULES } from './constants';
import {
  Severity,
  Priority,
  Effort,
  ActionType
} from './types';
import { isWithin7Days, isWithin30Days, daysDiff } from './utils';

interface RawChange {
  title: string;
  summary: string;
  fullText: string;
  effectiveDate?: string;
  source: string;
}

export function determineSeverity(change: RawChange): Severity {
  const text = (change.title + ' ' + change.summary + ' ' + change.fullText).toLowerCase();

  // Critical: Immediate action required
  if (
    text.includes('effective immediately') ||
    text.match(/rate.*\d+%.*to.*\d+%/) ||
    text.includes('new tariff') ||
    text.includes('sdn list') ||
    text.match(/add.*to.*sdn|sdn.*add|entity.*list.*add|denied.*person.*add|blocked.*person|embargo|proliferation.*concern/i) ||
    text.match(/russia|belarus|iran|north.*korea|cuba|syria|venezuela|burma.*military/i) && text.match(/sanction|restrict|prohibit|block/i) ||
    (change.effectiveDate && isWithin7Days(change.effectiveDate))
  ) {
    return 'critical';
  }

  // High: Action required within 30 days
  if (
    (change.effectiveDate && isWithin30Days(change.effectiveDate)) ||
    text.includes('new requirement') ||
    text.match(/ofac|sanctions|denied.*part|entity.*list|export.*control/i) ||
    text.includes('fta') ||
    text.includes('usmca')
  ) {
    return 'high';
  }

  // Medium: Informational, may require future action
  if (
    text.includes('proposed rule') ||
    text.includes('classification ruling') ||
    text.includes('guidance') ||
    text.match(/general.*license|special.*license/i)
  ) {
    return 'medium';
  }

  return 'low';
}

export function mapToModules(change: RawChange): number[] {
  const modules: Set<number> = new Set();
  const lowerText = (change.title + ' ' + change.summary).toLowerCase();

  // Priority: Denied Party Screening (critical compliance area)
  if (
    lowerText.match(/sdn|ofac|sanctions|denied.*person|denied.*part|entity.*list|blocked.*person|restricted.*part|specially.*designated|embargo|export.*control|itar|ear|military.*end.*user|unverified.*list|proliferation/i)
  ) {
    modules.add(3); // Restricted Party Screening
  }

  // Check each module's trigger keywords
  for (const [moduleId, productModule] of Object.entries(PRODUCT_MODULES)) {
    for (const trigger of productModule.triggers) {
      if (trigger === '*') {
        // Skip wildcard for now
        continue;
      }
      if (lowerText.includes(trigger.toLowerCase())) {
        modules.add(parseInt(moduleId));
      }
    }
  }

  // If no modules matched, try broader matching
  if (modules.size === 0) {
    if (lowerText.includes('trade') || lowerText.includes('tariff')) {
      modules.add(1); // Tariff calculator
    }
  }

  return Array.from(modules);
}

export function determineActionType(change: RawChange): ActionType {
  const text = (change.title + ' ' + change.summary).toLowerCase();

  if (text.includes('rate') || text.includes('tariff')) {
    return 'DATA_UPDATE';
  }
  if (text.includes('new requirement') || text.includes('rule')) {
    return 'LOGIC_CHANGE';
  }
  if (text.includes('portal') || text.includes('system')) {
    return 'NEW_FEATURE';
  }
  if (text.includes('classification ruling')) {
    return 'DATA_UPDATE';
  }
  if (text.includes('proposed')) {
    return 'MONITORING';
  }

  return 'CONTENT_UPDATE';
}

export function determinePriority(
  severity: Severity,
  effectiveDate?: string
): Priority {
  if (!effectiveDate) {
    if (severity === 'critical') return 'P0';
    if (severity === 'high') return 'P1';
    return 'P2';
  }

  const days = daysDiff(new Date(), new Date(effectiveDate));

  if (severity === 'critical' || days <= 7) return 'P0';
  if (days <= 30) return 'P1';
  if (days <= 90) return 'P2';
  return 'P3';
}

export function estimateEffort(
  actionType: ActionType,
  moduleCount: number
): Effort {
  if (actionType === 'DATA_UPDATE') return 'S';
  if (actionType === 'CONTENT_UPDATE') return 'S';
  if (actionType === 'NEW_FEATURE') return 'L';
  if (moduleCount >= 3) return 'L';
  if (actionType === 'LOGIC_CHANGE') return 'M';
  return 'M';
}

export function getTeamsForModules(moduleIds: number[]): string[] {
  const teams = new Set<string>();
  moduleIds.forEach((id) => {
    const productModule = PRODUCT_MODULES[id];
    if (productModule) teams.add(productModule.team);
  });

  // Always include content and alerts for high-impact items
  if (moduleIds.length >= 2) {
    teams.add(PRODUCT_MODULES[9].team);
    teams.add(PRODUCT_MODULES[10].team);
  }

  return Array.from(teams);
}

export function getTimezonesForModules(moduleIds: number[]): string[] {
  const timezones = new Set<string>();
  moduleIds.forEach((id) => {
    const productModule = PRODUCT_MODULES[id];
    if (productModule) {
      productModule.timezones.forEach((tz) => timezones.add(tz));
    }
  });
  return Array.from(timezones);
}

export function mapToFTAs(change: RawChange): string[] {
  const ftas: Set<string> = new Set();
  const text = (change.title + ' ' + change.summary + ' ' + change.fullText).toLowerCase();

  // USMCA (US-Mexico-Canada Agreement)
  if (text.match(/usmca|nafta|mexico|canada|north.*america.*trade/)) {
    ftas.add('USMCA');
  }

  // US-UK Economic Partnership Deal
  if (text.match(/united.*kingdom|u\.?k\.|british|uk.*trade/)) {
    ftas.add('US-UK-EPD');
  }

  // US-EU Framework
  if (text.match(/european.*union|e\.?u\.|europe|brussels/)) {
    ftas.add('US-EU-Framework');
  }

  // US-Japan STIA
  if (text.match(/japan|japanese|tokyo/)) {
    ftas.add('US-Japan-STIA');
  }

  // US-Korea STID
  if (text.match(/korea|korean|seoul/)) {
    ftas.add('US-Korea-STID');
  }

  // US-China Truce
  if (text.match(/china|chinese|beijing|section 301|301 tariff/)) {
    ftas.add('US-China-Truce');
  }

  return Array.from(ftas);
}
