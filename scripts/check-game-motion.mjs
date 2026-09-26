import assert from 'node:assert/strict';
import { createGame, step, replay, MIN_X, MAX_X, top } from '../lib/game.ts';
import { STEP_MS, createMotionFrame, captureMotion, motionView, blend } from '../lib/game-motion.ts';

// Constant-speed presentation must advance smoothly, even between simulation ticks.
for (const hz of [60,80,90,120]) {
  for (const jitter of [false,true]) {
    const g=createGame(1), previous=createMotionFrame();
    let acc=0,last=0,lastVisual=-1;
    for(let i=1;i<=hz*10;i++) {
      const time=i*1000/hz+(jitter?Math.sin(i*1.7)*.2:0);
      acc+=time-last; last=time;
      while(acc+1e-7>=STEP_MS) {captureMotion(g,previous);g.tick++;g.x++;acc=Math.max(0,acc-STEP_MS);}
      const visual=motionView(g,previous,acc/STEP_MS);
      if(g.tick>0) {
        assert.ok(Math.abs(visual.tick-(time/STEP_MS-1))<1e-6);
        assert.ok(visual.tick>lastVisual);lastVisual=visual.tick;
      }
    }
  }
}
// Interpolation never changes collision coordinates, scores or deterministic replay.
for(let seed=1;seed<=100;seed++) {
  const g=createGame(seed), previous=createMotionFrame(), moves=[];
  while(!g.ended) {
    const drop=g.drops.filter(d=>d.y<top(g)).sort((a,b)=>b.y-a.y)[0];
    const target=Math.max(MIN_X,Math.min(MAX_X,drop?(drop.kind===5?(drop.x<210?MAX_X:MIN_X):drop.x):g.x));
    captureMotion(g,previous);moves.push(target);step(g,target);
    const state=JSON.stringify(g);
    for(const alpha of [0,.25,.5,.75,1]) {
      const view=motionView(g,previous,alpha);
      for(const d of view.drops) blend(previous.drops.get(d.id)??d.y,d.y,alpha);
    }
    assert.equal(JSON.stringify(g),state);
  }
  assert.deepEqual(replay(seed,moves),g);
  assert.equal(motionView(g,previous,.5),g); // Results use the exact final tower.
  const next=createGame(seed+1);assert.equal(motionView(next,previous,.5),next);
}
assert.equal(blend(0,10,-1),0);assert.equal(blend(0,10,2),10);
console.log('PASS: smooth 60/80/90/120 Hz + jitter; 100 unchanged replays; exact results and fresh rounds.');
