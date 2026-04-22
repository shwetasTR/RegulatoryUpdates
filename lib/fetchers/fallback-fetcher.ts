import * as cheerio from 'cheerio';
import { RegulatoryChange, FetchUpdatesResponse } from '../types';
import {
  determineSeverity,
  mapToModules,
  determineActionType,
  determinePriority,
  estimateEffort,
  getTeamsForModules,
  getTimezonesForModules,
  mapToFTAs
} from '../classification';

interface PartialChange {
  title: string;
  summary: string;
  source: 'CSMS' | 'WH' | 'OFAC';
  sourceId: string;
  url: string;
  publishDate: string;
  effectiveDate?: string;
  fullText: string;
}

interface FederalRegisterDocument {
  title: string;
  abstract?: string;
  document_number: string;
  html_url: string;
  publication_date: string;
  effective_on?: string;
}

export async function fetchWithFallback(): Promise<
  Omit<FetchUpdatesResponse, 'status' | 'dataSource' | 'timestamp'>
> {
  const changes: PartialChange[] = [];

  try {
    const frChanges = await fetchFromFederalRegister();
    changes.push(...frChanges);
  } catch (error) {
    console.error('[Fallback] Federal Register fetch failed:', error);
  }

  try {
    const whChanges = await scrapeWhiteHouse();
    changes.push(...whChanges);
  } catch (error) {
    console.error('[Fallback] White House scrape failed:', error);
  }

  // Classify each change
  const classifiedChanges: RegulatoryChange[] = changes.map((raw) => {
    const severity = determineSeverity(raw);
    const productModules = mapToModules(raw);
    const actionType = determineActionType(raw);
    const priority = determinePriority(severity, raw.effectiveDate);
    const effort = estimateEffort(actionType, productModules.length);

    // Add content and alerts for high/critical
    if (severity === 'critical' || severity === 'high') {
      if (!productModules.includes(9)) productModules.push(9);
      if (!productModules.includes(10)) productModules.push(10);
    }

    const ftasAffected = mapToFTAs(raw);

    return {
      id: crypto.randomUUID(),
      ...raw,
      severity,
      productModules,
      actionType,
      priority,
      effort,
      teams: getTeamsForModules(productModules),
      timezones: getTimezonesForModules(productModules),
      legalAuthority: undefined,
      htsChapters: undefined,
      ftasAffected: ftasAffected.length > 0 ? ftasAffected : undefined,
    };
  });

  const metadata = {
    cbpCsmsCount: classifiedChanges.filter((c) => c.source === 'CSMS').length,
    whiteHouseCount: classifiedChanges.filter((c) => c.source === 'WH').length,
    ofacCount: classifiedChanges.filter((c) => c.source === 'OFAC').length,
    criticalCount: classifiedChanges.filter((c) => c.severity === 'critical').length,
  };

  return { changes: classifiedChanges, metadata };
}

async function fetchFromFederalRegister(): Promise<PartialChange[]> {
  try {
    // CBP Documents
    const cbpUrl = new URL('https://www.federalregister.gov/api/v1/documents.json');
    cbpUrl.searchParams.set('conditions[agencies][]', 'u-s-customs-and-border-protection');
    cbpUrl.searchParams.append('conditions[type][]', 'RULE');
    cbpUrl.searchParams.append('conditions[type][]', 'NOTICE');
    cbpUrl.searchParams.set('per_page', '15');
    cbpUrl.searchParams.set('order', 'newest');

    const cbpResponse = await fetch(cbpUrl.toString());
    if (!cbpResponse.ok) {
      console.error('[Federal Register] CBP fetch failed:', cbpResponse.status);
      return [];
    }

    const cbpData = await cbpResponse.json();

    const cbpChanges = (cbpData.results || []).map((doc: FederalRegisterDocument) => ({
      title: doc.title,
      summary: doc.abstract || doc.title,
      source: 'CSMS' as const,
      sourceId: doc.document_number,
      url: doc.html_url,
      publishDate: doc.publication_date,
      effectiveDate: doc.effective_on || undefined,
      fullText: doc.abstract || doc.title,
    }));

    // OFAC/Treasury Documents for Denied Party Screening
    const ofacUrl = new URL('https://www.federalregister.gov/api/v1/documents.json');
    ofacUrl.searchParams.set('conditions[agencies][]', 'treasury-department');
    ofacUrl.searchParams.set('conditions[term]', 'OFAC sanctions SDN');
    ofacUrl.searchParams.set('per_page', '10');
    ofacUrl.searchParams.set('order', 'newest');

    const ofacResponse = await fetch(ofacUrl.toString());
    const ofacData = ofacResponse.ok ? await ofacResponse.json() : { results: [] };

    const ofacChanges = (ofacData.results || []).map((doc: FederalRegisterDocument) => ({
      title: doc.title,
      summary: doc.abstract || doc.title,
      source: 'OFAC' as const,
      sourceId: doc.document_number,
      url: doc.html_url,
      publishDate: doc.publication_date,
      effectiveDate: doc.effective_on || undefined,
      fullText: doc.abstract || doc.title,
    }));

    return [...cbpChanges, ...ofacChanges];
  } catch (error) {
    console.error('[Federal Register] Fetch error:', error);
    return [];
  }
}

async function scrapeWhiteHouse(): Promise<PartialChange[]> {
  const url = 'https://www.whitehouse.gov/presidential-actions/';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const changes: PartialChange[] = [];

  $('.briefing-statement__title').each((_, element) => {
    const $el = $(element);
    const $link = $el.find('a');
    const title = $link.text().trim();
    const href = $link.attr('href') || '';

    // Only include trade-related items
    if (
      title.toLowerCase().includes('tariff') ||
      title.toLowerCase().includes('trade') ||
      title.toLowerCase().includes('section') ||
      title.toLowerCase().includes('proclamation')
    ) {
      const $parent = $el.closest('.briefing-statement');
      const dateText = $parent.find('.briefing-statement__date').text().trim();

      changes.push({
        title,
        summary: title,
        source: 'WH' as const,
        sourceId: href.split('/').pop() || '',
        url: `https://www.whitehouse.gov${href}`,
        publishDate: new Date(dateText).toISOString().split('T')[0],
        effectiveDate: undefined,
        fullText: title,
      });
    }
  });

  return changes;
}
