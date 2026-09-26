import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {bestByNickname,leaderboardQuery} from '../lib/leaderboard.ts';

const db=new DatabaseSync(':memory:');
db.exec('CREATE TABLE rounds(id TEXT PRIMARY KEY,name TEXT,score INTEGER,scoops INTEGER,finished INTEGER,version INTEGER,day TEXT,week TEXT)');
const insert=db.prepare('INSERT INTO rounds VALUES(?,?,?,?,?,?,?,?)');
const add=(id,name,score,finished,day='2026-09-26',week='2026-09-21',version=3)=>insert.run(id,name,score,score%25,finished,version,day,week);
add('old','Ana',900,1,'2026-09-18','2026-09-14');
add('a','Ana',700,2);add('b',' ANA ',650,3);add('c','ana',700,4);
add('d','Čedo',600,5);add('e','ČEDO',550,6);add('f','C\u030cedo',500,7);
add('g','Dva  Imena',450,8);add('h','Dva Imena',400,9);
add('private',null,9999,10);add('unfinished','Nedovršen',9999,null);add('legacy','Stara pravila',9999,11,undefined,undefined,2);
for(let i=0;i<20;i++) add('extra'+i,'Igrač '+i,300-i,100+i);
const before=db.prepare('SELECT * FROM rounds ORDER BY id').all();
const read=period=>bestByNickname(db.prepare(leaderboardQuery(period)).all(...(period==='day'?[3,'2026-09-26']:period==='week'?[3,'2026-09-21']:[3])));
const all=read('all'),day=read('day'),week=read('week');
assert.equal(all.length,23);assert.equal(all[0].id,'old');assert.equal(day[0].id,'a');assert.equal(week[0].id,'a');
assert.equal(all.filter(r=>r.name==='Čedo').length,1);
assert.equal(all.filter(r=>r.name.startsWith('Dva')).length,1);
assert.ok(!all.some(r=>['private','unfinished','legacy'].includes(r.id)));
assert.equal(day[0].scoops,700%25);assert.equal(day[0].score,700);
assert.deepEqual(Object.keys(all[0]).sort(),['id','name','scoops','score']);
assert.deepEqual(read(null),all);assert.deepEqual(bestByNickname([]),[]);
assert.deepEqual(db.prepare('SELECT * FROM rounds ORDER BY id').all(),before);
db.close();
if(process.argv[2]) {
  const rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const eligible=rows.filter(r=>r.version===3&&r.finished!==null&&r.name!==null);
  const result=bestByNickname(eligible);
  assert.equal(result.length,8);assert.equal(result[0].score,6736);
  assert.equal(result.filter(r=>r.name==='Danijel Bernatović').length,1);
  assert.equal(result.at(-1).name,'Kiki');assert.equal(result.at(-1).score,6145);
  console.log('Production snapshot: 15 public rounds -> 8 nicknames; all original rounds retained.');
}
console.log('PASS: best per nickname, accents/case/spaces, ties, period filters, >10 names, privacy and unchanged records.');
