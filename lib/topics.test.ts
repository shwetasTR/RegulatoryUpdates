import { describe, it, expect } from 'vitest';
import { deriveTopic, topicColor, TOPICS } from './topics';
import type { RegulatoryChange } from './types';

function makeChange(overrides: Partial<RegulatoryChange>): RegulatoryChange {
  return {
    id: 'test-1',
    source: 'CSMS',
    sourceId: 'src-1',
    title: '',
    summary: '',
    fullText: '',
    url: '',
    publishDate: '2026-05-09',
    severity: 'medium',
    productModules: [],
    actionType: 'DATA_UPDATE',
    priority: 'P2',
    effort: 'M',
    teams: [],
    timezones: [],
    ...overrides,
  };
}

describe('deriveTopic', () => {
  it('maps OFAC source to Sanctions / Export Controls', () => {
    expect(deriveTopic(makeChange({ source: 'OFAC', title: 'Anything' }))).toBe(
      'Sanctions / Export Controls'
    );
  });

  it('maps BIS source to Sanctions / Export Controls', () => {
    expect(deriveTopic(makeChange({ source: 'BIS', title: 'Export rule' }))).toBe(
      'Sanctions / Export Controls'
    );
  });

  it('maps OFAC even when title also contains tariff keywords', () => {
    expect(
      deriveTopic(makeChange({ source: 'OFAC', title: 'New tariff section 232 sanction' }))
    ).toBe('Sanctions / Export Controls');
  });

  it('maps SDN keyword to Sanctions / Export Controls', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'SDN list update', summary: '' }))
    ).toBe('Sanctions / Export Controls');
  });

  it('maps tariff keywords to Tariffs & Duties', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'Section 232 steel tariff change' }))
    ).toBe('Tariffs & Duties');
  });

  it('maps HTS keyword to Tariffs & Duties', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'HTS chapter 84 update', summary: '' }))
    ).toBe('Tariffs & Duties');
  });

  it('maps ftasAffected presence to Trade Agreements', () => {
    expect(
      deriveTopic(
        makeChange({ source: 'USTR', title: 'Quarterly review', ftasAffected: ['USMCA'] })
      )
    ).toBe('Trade Agreements');
  });

  it('maps USMCA keyword to Trade Agreements', () => {
    expect(
      deriveTopic(makeChange({ source: 'USTR', title: 'USMCA panel decision' }))
    ).toBe('Trade Agreements');
  });

  it('maps customs filing keywords to Customs Filing', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'ACE manifest update' }))
    ).toBe('Customs Filing');
  });

  it('maps forced labor / UFLPA to Restricted Parties', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'UFLPA enforcement update' }))
    ).toBe('Restricted Parties');
  });

  it('maps White House country mention to Country Actions', () => {
    expect(
      deriveTopic(makeChange({ source: 'WH', title: 'Executive order on China trade' }))
    ).toBe('Country Actions');
  });

  it('falls back to General when nothing matches', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'Routine bulletin', summary: 'Nothing notable' }))
    ).toBe('General');
  });

  it('is case-insensitive on keywords', () => {
    expect(
      deriveTopic(makeChange({ source: 'CSMS', title: 'TARIFF UPDATE' }))
    ).toBe('Tariffs & Duties');
  });
});

describe('topicColor', () => {
  it('returns a Tailwind class string for every TOPICS entry', () => {
    for (const topic of TOPICS) {
      const color = topicColor(topic);
      expect(color).toMatch(/bg-/);
      expect(color).toMatch(/text-/);
    }
  });
});
