export type RankedRound = { id:string; name:string; score:number; scoops:number; finished:number };

export function leaderboardQuery(period:string|null) {
  const filter=period==='day'?' AND day=?':period==='week'?' AND week=?':'';
  return 'SELECT id,name,score,scoops,finished FROM rounds WHERE version=? AND finished IS NOT NULL AND name IS NOT NULL'+filter;
}

// Group public nicknames, not device IDs: the same nickname may use several devices.
// This only changes the view; every original round stays in the shared database.
export function bestByNickname(rounds:RankedRound[]) {
  const best=new Map<string,RankedRound>();
  const order=(a:RankedRound,b:RankedRound)=>b.score-a.score||a.finished-b.finished||a.id.localeCompare(b.id);
  for(const round of rounds) {
    const key=round.name.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('hr-HR');
    if(!key) continue;
    const previous=best.get(key);
    if(!previous||order(round,previous)<0) best.set(key,round);
  }
  return [...best.values()].sort(order).map(({id,name,score,scoops})=>({id,name,score,scoops}));
}
