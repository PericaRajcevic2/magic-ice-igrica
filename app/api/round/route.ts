import { getDb } from '@/db';
import { GAME_VERSION } from '@/lib/game';
import { deviceId, playerCookie } from '@/lib/player';
export async function POST(request: Request) {
  try {
    const id = crypto.randomUUID(), seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const player = deviceId(request) ?? crypto.randomUUID();
    await getDb().prepare('INSERT INTO rounds (id,seed,started,device_id,version) VALUES (?,?,?,?,?)').bind(id,seed,Date.now(),player,GAME_VERSION).run();
    return Response.json({ id,seed,version:GAME_VERSION }, { headers: { 'Cache-Control':'no-store', 'Set-Cookie':playerCookie(player,request) } });
  } catch (e) { console.error('Round start failed',e); return Response.json({ error:'Igra trenutno nije dostupna.' },{ status:503 }); }
}
