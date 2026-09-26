import { getDb } from '@/db';
import { replay,MAX_TICKS,MIN_X,MAX_X,GAME_VERSION } from '@/lib/game';
import { deviceId } from '@/lib/player';
import { periodKeys } from '@/lib/periods';
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('Content-Length')) > 50000) return Response.json({ error:'Too large' },{ status:413 });
    const body = await request.text();
    if (body.length > 50000) return Response.json({ error:'Too large' },{ status:413 });
    let data;
    try { data = JSON.parse(body); } catch { return Response.json({ error:'Invalid game' },{ status:400 }); }
    if (!data || typeof data.id !== 'string' || (data.name !== undefined && typeof data.name !== 'string') || !Array.isArray(data.moves) || data.moves.length > MAX_TICKS || data.moves.some((x:unknown) => typeof x !== 'number' || !Number.isFinite(x) || x < MIN_X || x > MAX_X)) return Response.json({ error:'Invalid game' },{ status:400 });
    const name = data.name?.trim();
    if (name !== undefined && !/^[\p{L}\p{N} _.-]{2,18}$/u.test(name)) return Response.json({ error:'Invalid name' },{ status:400 });
    const db = getDb();
    const row = await db.prepare('SELECT seed,started,finished,device_id,version,score,scoops,name FROM rounds WHERE id=?').bind(data.id).first<{ seed:number;started:number;finished:number|null;device_id:string|null;version:number;score:number;scoops:number;name:string|null }>();
    if (!row || !deviceId(request) || row.device_id !== deviceId(request)) return Response.json({ error:'Missing game' },{ status:404 });
    if (row.version !== GAME_VERSION) return Response.json({ error:'Osvježi stranicu za novu verziju igre.' },{ status:409 });
    if (!row.finished) {
      if (Date.now() - row.started > 1200000 || Date.now() - row.started < data.moves.length / 60 * 1000 - 1500) return Response.json({ error:'Expired or invalid game' },{ status:400 });
      let result;
      try { result = replay(row.seed,data.moves); } catch { return Response.json({ error:'Invalid replay' },{ status:400 }); }
      const { day,week } = periodKeys();
      await db.prepare('UPDATE rounds SET finished=?,score=?,scoops=?,day=?,week=? WHERE id=? AND finished IS NULL').bind(Date.now(),result.score,result.stack.length,day,week,data.id).run();
    }
    // Public visibility is a separate, voluntary action after private autosave.
    if (name !== undefined) await db.prepare('UPDATE rounds SET name=? WHERE id=? AND name IS NULL').bind(name,data.id).run();
    const result = await db.prepare('SELECT score,scoops,name FROM rounds WHERE id=?').bind(data.id).first<{ score:number;scoops:number;name:string|null }>();
    const previous = await db.prepare('SELECT MAX(score) AS score FROM rounds WHERE device_id=? AND version=? AND finished IS NOT NULL AND id<>?').bind(row.device_id,GAME_VERSION,data.id).first<{ score:number|null }>();
    return Response.json({ saved:true,score:result!.score,scoops:result!.scoops,published:!!result!.name,best:Math.max(result!.score,previous?.score ?? 0),isRecord:result!.score > (previous?.score ?? 0) },{ headers:{ 'Cache-Control':'no-store' } });
  } catch (e) { console.error('Result save failed',e); return Response.json({ error:'Saving unavailable' },{ status:503 }); }
}
