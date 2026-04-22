import { NextResponse } from 'next/server';
import { getTRClaudeClient } from '@/lib/tr-claude-auth';
import { fetchWithClaude } from '@/lib/fetchers/claude-fetcher';
import { fetchWithFallback } from '@/lib/fetchers/fallback-fetcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    console.log('[API] Attempting TR Claude fetch...');

    const claudeClient = await getTRClaudeClient();

    if (claudeClient) {
      const data = await fetchWithClaude(claudeClient);
      const duration = Date.now() - startTime;

      console.log(`[API] ✓ Success via TR Claude (${duration}ms)`);

      return NextResponse.json({
        status: 'success',
        dataSource: 'tr-claude',
        timestamp: new Date().toISOString(),
        ...data,
      });
    } else {
      console.log('[API] TR Claude unavailable, using fallback...');
      throw new Error('TR Claude auth failed');
    }
  } catch (error) {
    console.error('[API] Claude fetch failed:', error);

    try {
      console.log('[API] Attempting fallback fetch...');
      const data = await fetchWithFallback();
      const duration = Date.now() - startTime;

      console.log(`[API] ✓ Partial success via fallback (${duration}ms)`);

      return NextResponse.json({
        status: 'partial',
        dataSource: 'fallback',
        timestamp: new Date().toISOString(),
        ...data,
      });
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
}
