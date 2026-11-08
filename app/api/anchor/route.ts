import { getAnchorPanel } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Reproduce's proof card (docs/PLAN.md §6h J24). A good check may be cached for 5 minutes (here and at the CDN), so
// testnet is asked at most that often; a failed check is never cached, so a passing hiccup cannot stick and Try Again
// really asks again. The answer is our own reading of NEAR testnet and our saved days, no third-party API data.
let last: { at: number; body: Awaited<ReturnType<typeof getAnchorPanel>>['current'] } | null = null;
const FIVE_MIN = 5 * 60 * 1000;

export async function GET() {
  if (last && Date.now() - last.at < FIVE_MIN) {
    return Response.json(last.body, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=60' } });
  }
  const { current } = await getAnchorPanel();
  if (current.state === 'failed') {
    return Response.json(current, { headers: { 'cache-control': 'no-store' } });
  }
  last = { at: Date.now(), body: current };
  return Response.json(current, { headers: { 'cache-control': 'public, s-maxage=300, stale-while-revalidate=60' } });
}
