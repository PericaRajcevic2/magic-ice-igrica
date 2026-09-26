import { getDb } from '@/db';
import { deviceId } from '@/lib/player';
import { GAME_VERSION } from '@/lib/game';
export async function GET(request: Request) {
  try {
    const id = deviceId(request);
    const row = id ? await getDb().prepare('SELECT MAX(score) AS score FROM rounds WHERE device_id=? AND version=? AND finished IS NOT NULL').bind(id, GAME_VERSION).first<{ score: number | null }>() : null;
    return Response.json({ best: row?.score ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Rekord trenutno nije dostupan.' }, { status: 503 }); }
}
