import { NextResponse, NextRequest } from 'next/server';
import { getTRClaudeClient } from '@/lib/tr-claude-auth';
import { fetchWithClaude } from '@/lib/fetchers/claude-fetcher';
import { fetchWithFallback } from '@/lib/fetchers/fallback-fetcher';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  payload: unknown;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<unknown> | null = null;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const force = request.nextUrl.searchParams.get('force') === 'true';
  const now = Date.now();

  if (!force && cache && cache.expiresAt > now) {
    const ageSec = Math.round((now - (cache.expiresAt - CACHE_TTL_MS)) / 1000);
    console.log(`[API] ✓ Cache hit (age ${ageSec}s, ttl ${CACHE_TTL_MS / 1000}s)`);
    return NextResponse.json(cache.payload);
  }

  if (inflight) {
    console.log('[API] Coalescing with in-flight request');
    try {
      const payload = await inflight;
      return NextResponse.json(payload);
    } catch (err) {
      return NextResponse.json(
        { status: 'error', message: 'Upstream fetch failed.', error: String(err) },
        { status: 500 }
      );
    }
  }

  inflight = (async () => {
    try {
      console.log('[API] Attempting TR Claude fetch...');
      const claudeClient = await getTRClaudeClient();

      if (claudeClient) {
        const data = await fetchWithClaude(claudeClient);
        const duration = Date.now() - startTime;
        console.log(`[API] ✓ Success via TR Claude (${duration}ms)`);
        const payload = {
          status: 'success' as const,
          dataSource: 'tr-claude' as const,
          timestamp: new Date().toISOString(),
          ...data,
        };
        cache = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
        return payload;
      }
      throw new Error('TR Claude auth failed');
    } catch (error) {
      console.error('[API] Claude fetch failed:', error);
      console.log('[API] Attempting fallback fetch...');
      const data = await fetchWithFallback();
      const duration = Date.now() - startTime;
      console.log(`[API] ✓ Partial success via fallback (${duration}ms)`);
      const payload = {
        status: 'partial' as const,
        dataSource: 'fallback' as const,
        timestamp: new Date().toISOString(),
        ...data,
      };
      cache = { payload, expiresAt: Date.now() + CACHE_TTL_MS };
      return payload;
    } finally {
      inflight = null;
    }
  })();

  try {
    const payload = await inflight;
    return NextResponse.json(payload);
  } catch (fallbackError) {
    console.error('[API] ✗ All fetching failed:', fallbackError);
    return NextResponse.json(
      {
        status: 'error',
        message: 'All data sources failed. Please try again later.',
        error: String(fallbackError),
      },
      { status: 500 }
    );
  }
}
