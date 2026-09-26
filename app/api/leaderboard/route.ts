import { getDb } from '@/db';
import { periodKeys } from '@/lib/periods';
import { GAME_VERSION } from '@/lib/game';
import { bestByNickname, leaderboardQuery, type RankedRound } from '@/lib/leaderboard';
export async function GET(request: Request) {
  try {
    const period = new URL(request.url).searchParams.get('period'), { day,week } = periodKeys();
    const db = getDb();
    const statement=db.prepare(leaderboardQuery(period));
    const result=await (period==='day'?statement.bind(GAME_VERSION,day):period==='week'?statement.bind(GAME_VERSION,week):statement.bind(GAME_VERSION)).all<RankedRound>();
    return Response.json({ entries:bestByNickname(result.results) },{ headers:{ 'Cache-Control':'no-store' } });
  } catch (e) { console.error('Leaderboard failed',e); return Response.json({ error:'Leaderboard unavailable' },{ status:503 }); }
}
