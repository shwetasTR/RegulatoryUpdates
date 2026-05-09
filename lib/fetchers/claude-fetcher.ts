import Anthropic from '@anthropic-ai/sdk';
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

interface RawChange {
  title: string;
  summary: string;
  fullText: string;
  source: string;
  sourceId: string;
  url: string;
  publishDate: string;
  effectiveDate?: string;
}

export async function fetchWithClaude(
  client: Anthropic
): Promise<Omit<FetchUpdatesResponse, 'status' | 'dataSource' | 'timestamp'>> {

  const today = new Date().toISOString().split('T')[0];

  const prompt = `You are a regulatory intelligence analyst. Search for the latest US trade regulatory updates and structure them into actionable intelligence.

**PRIMARY SOURCES TO SEARCH:**
1. CBP CSMS (Cargo Systems Messaging Service) - cbp.gov/trade/automated/cargo-systems-messaging-service
2. White House Presidential Actions - whitehouse.gov/presidential-actions

**CURRENT DATE:** ${today}

**SEARCH QUERIES:**
- "CBP CSMS cargo systems messaging service April 2026"
- "whitehouse.gov presidential actions tariff trade April 2026"
- "OFAC sanctions updates April 2026" (supplementary)

**FOR EACH REGULATORY UPDATE FOUND:**

Extract and return in JSON format:
- title (clear, concise)
- summary (1-2 sentences)
- source ("CSMS" | "WH" | "OFAC" | "USTR" | "BIS")
- sourceId (e.g., "CSMS #60987654")
- url (link to original)
- publishDate (YYYY-MM-DD format)
- effectiveDate (YYYY-MM-DD format, or null)
- fullText (complete text of the update)

**FOCUS:** Trade-significant updates only (skip routine system maintenance).
**TIMEFRAME:** Past 7-14 days.
**FORMAT:** Return ONLY a valid JSON array, no additional commentary.

Example structure:
[
  {
    "title": "Section 232 Metals Tariff Update",
    "summary": "New 50% tariff on steel articles effective immediately",
    "source": "WH",
    "sourceId": "Proclamation-2026-04-02",
    "url": "https://whitehouse.gov/...",
    "publishDate": "2026-04-02",
    "effectiveDate": "2026-04-06",
    "fullText": "Full text here..."
  }
]`;

  try {
    const tools: Anthropic.ToolUnion[] = [
      { type: 'web_search_20260209', name: 'web_search' },
    ];

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: prompt },
    ];

    let response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      temperature: 0.3,
      tools,
      messages,
    });

    // Server-side tools (web_search) cap their internal loop at 10 iterations.
    // If hit, stop_reason === 'pause_turn' and we re-send to continue.
    let pauseTurns = 0;
    while (response.stop_reason === 'pause_turn' && pauseTurns < 5) {
      messages.push({ role: 'assistant', content: response.content });
      response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        temperature: 0.3,
        tools,
        messages,
      });
      pauseTurns += 1;
    }

    // Concatenate every text block — with web_search, Claude interleaves
    // narration between tool calls, so the final JSON array is in the last
    // text block, not the first.
    const fullText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    if (!fullText) {
      throw new Error('No text content in Claude response');
    }

    // Parse JSON — match the LAST array in the combined text (greedy).
    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : '[]';
    const rawChanges = JSON.parse(jsonString);

    // Post-process: classify and enrich
    const changes: RegulatoryChange[] = rawChanges.map((raw: RawChange) => {
      const severity = determineSeverity(raw);
      const productModules = mapToModules(raw);
      const actionType = determineActionType(raw);
      const priority = determinePriority(severity, raw.effectiveDate);
      const effort = estimateEffort(actionType, productModules.length);

      // Always include content (9) and alerts (10) for high/critical
      if (severity === 'critical' || severity === 'high') {
        if (!productModules.includes(9)) productModules.push(9);
        if (!productModules.includes(10)) productModules.push(10);
      }

      // Map to affected FTAs
      const ftasAffected = mapToFTAs({
        title: raw.title,
        summary: raw.summary,
        fullText: raw.fullText,
        source: raw.source,
        effectiveDate: raw.effectiveDate
      });

      return {
        id: crypto.randomUUID(),
        title: raw.title,
        summary: raw.summary,
        source: raw.source,
        sourceId: raw.sourceId,
        url: raw.url,
        publishDate: raw.publishDate,
        effectiveDate: raw.effectiveDate,
        fullText: raw.fullText,
        severity,
        productModules,
        actionType,
        priority,
        effort,
        teams: getTeamsForModules(productModules),
        timezones: getTimezonesForModules(productModules),
        legalAuthority: null,
        htsChapters: null,
        ftasAffected: ftasAffected.length > 0 ? ftasAffected : undefined,
      };
    });

    // Calculate metadata
    const metadata = {
      cbpCsmsCount: changes.filter((c) => c.source === 'CSMS').length,
      whiteHouseCount: changes.filter((c) => c.source === 'WH').length,
      ofacCount: changes.filter((c) => c.source === 'OFAC').length,
      criticalCount: changes.filter((c) => c.severity === 'critical').length,
    };

    return { changes, metadata };
  } catch (error) {
    console.error('[Claude Fetcher] Error:', error);
    throw error;
  }
}
