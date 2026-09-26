export const GAME_VERSION = 3;
export const TICKS = 2100, WIDTH = 420, HEIGHT = 600;
export const TIME_BONUS_TICKS = 120, MAX_TIME_BONUSES = 2;
export const MAX_TICKS = TICKS + TIME_BONUS_TICKS * MAX_TIME_BONUSES;
export const MIN_X = 28, MAX_X = WIDTH - 28;
export type Drop = { id: number; x: number; y: number; kind: number; done: boolean; speed?: number };
export type CatchEvent = { id: number; tick: number; x: number; y: number; type: 'catch' | 'perfect' | 'gold' | 'fruit' | 'time' | 'combo' | 'hurt'; label: string };
export type Game = {
  tick: number; x: number; velocity: number; score: number; lives: number;
  stack: number[]; landed: number[]; drops: Drop[]; seed: number; next: number;
  serial: number; ended: boolean; streak: number; bestStreak: number; perfects: number;
  golds: number; fruits: number; baseScore: number; perfectScore: number; comboScore: number;
  events: CatchEvent[]; eventSerial: number; lastDropX: number;
  duration: number; timeBonuses: number; timeSpawned: number; lastTimeTick: number; bag: number[];
};
export function createGame(seed: number): Game {
  return { tick: 0, x: WIDTH / 2, velocity: 0, score: 0, lives: 3, stack: [], landed: [], drops: [],
    seed: seed >>> 0, next: 30, serial: 0, ended: false, streak: 0, bestStreak: 0,
    perfects: 0, golds: 0, fruits: 0, baseScore: 0, perfectScore: 0, comboScore: 0,
    events: [], eventSerial: 0, lastDropX: WIDTH / 2,
    duration: TICKS, timeBonuses: 0, timeSpawned: 0, lastTimeTick: 0, bag: [] };
}
function random(g: Game) { g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0; return g.seed / 4294967296; }
function nextKind(g: Game) {
  if (g.serial < 3) return Math.floor(random(g) * 3);
  // Seeded shuffle bags give variety without long droughts of fruit or gold.
  // The server runs this exact same sequence when validating the replay.
  if (g.tick > 480 && g.tick < g.duration - 240 && g.timeSpawned < MAX_TIME_BONUSES && g.tick - g.lastTimeTick > 360 && random(g) < .14) {
    g.timeSpawned++; g.lastTimeTick = g.tick; return 7;
  }
  if (!g.bag.length) {
    g.bag = [0, 0, 1, 1, 2, 2, 3, 5, 6, 6];
    for (let i = g.bag.length - 1; i > 0; i--) {
      const j = Math.floor(random(g) * (i + 1));
      [g.bag[i], g.bag[j]] = [g.bag[j], g.bag[i]];
    }
  }
  return g.bag.pop()!;
}
export function spacing(g: Game) { return Math.min(28, 216 / Math.max(1, g.stack.length)); }
export function top(g: Game) { return g.stack.length ? 451 - (g.stack.length - 1) * spacing(g) - 33 : 451; }
export function sway(g: Game, i: number) {
  const weight = (i + 1) / Math.max(1, g.stack.length);
  return (Math.sin(g.tick / 23 - i * .24) * Math.min(9, g.stack.length * .5) - g.velocity * .65) * weight;
}
export function catcherX(g: Game) { return g.x + (g.stack.length ? sway(g, g.stack.length - 1) : 0); }
function event(g: Game, type: CatchEvent['type'], label: string, x: number, y: number) {
  g.events.push({ id: g.eventSerial++, tick: g.tick, x, y, type, label });
}
function loseLife(g: Game, label: string, x: number, y: number) {
  g.lives = Math.max(0, g.lives - 1); g.streak = 0;
  event(g, 'hurt', label, x, y);
}
export function step(g: Game, target: number) {
  if (g.ended) return;
  g.tick++;
  g.velocity = (Math.max(MIN_X, Math.min(MAX_X, target)) - g.x) * .27;
  g.x += g.velocity;
  const pace = Math.min(1, g.tick / TICKS);
  const fallSpeed = 3.05 + pace * 2.3;
  if (g.tick >= g.next && g.tick < g.duration - Math.ceil((top(g) + 38) / (fallSpeed * .94)) - 3) {
    const kind = nextKind(g);
    const reach = g.serial < 3 ? 95 : 190;
    const x = Math.max(43, Math.min(WIDTH - 43, g.lastDropX + (random(g) * 2 - 1) * reach));
    g.lastDropX = x;
    g.drops.push({ id: g.serial++, x, y: -38, kind, done: false, speed: .94 + random(g) * .18 });
    g.next = g.tick + Math.round((79 - pace * 25) * (.82 + random(g) * .36));
  }
  const catchY = top(g), catchX = catcherX(g);
  for (const d of g.drops) {
    if (d.done) continue;
    const previous = d.y;
    d.y += fallSpeed * (d.speed ?? 1);
    if (previous < catchY && d.y >= catchY && Math.abs(d.x - catchX) < 32) {
      d.done = true;
      if (d.kind === 5) {
        loseLife(g, 'Otopljena! −1 život', d.x, catchY);
      } else if (d.kind === 7) {
        if (g.timeBonuses < MAX_TIME_BONUSES) {
          g.timeBonuses++; g.duration += TIME_BONUS_TICKS;
          event(g, 'time', 'JOŠ ČAROLIJE! +2 s', d.x, catchY);
        }
      } else {
        g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak);
        const base = d.kind === 3 ? 500 : d.kind === 6 ? 150 : 100;
        g.baseScore += base;
        let perfect = false, precision = 0;
        if (d.kind === 6) g.fruits++;
        else {
          g.stack.push(d.kind); g.landed.push(g.tick);
          if (d.kind === 3) g.golds++;
          const distance = Math.abs(d.x - catchX);
          precision = Math.round(25 * (1 - distance / 32));
          perfect = distance <= 8;
          if (perfect) g.perfects++;
          g.perfectScore += precision;
        }
        event(g, d.kind === 3 ? 'gold' : d.kind === 6 ? 'fruit' : perfect ? 'perfect' : 'catch',
          d.kind === 3 ? `ZLATNA! +${base + precision}` : d.kind === 6 ? 'VOĆNA ČAROLIJA! +150' : perfect ? `PRECIZNO! +${base + precision}` : `+${base + precision}`, d.x, catchY);
        if (g.streak % 5 === 0) {
          g.comboScore += 200;
          event(g, 'combo', `${g.streak} U NIZU! +200`, WIDTH / 2, 122);
        }
        g.score = g.baseScore + g.perfectScore + g.comboScore;
      }
    } else if (d.y > HEIGHT + 36) {
      d.done = true;
      if (d.kind < 4) loseLife(g, 'Promašaj! −1 život', d.x, 450);
    }
    if (!g.lives) break;
  }
  g.events = g.events.filter(e => g.tick - e.tick < 62);
  g.drops = g.drops.filter(d => !d.done);
  g.ended = g.lives === 0 || g.tick >= g.duration;
}
export function replay(seed: number, moves: number[]) {
  const g = createGame(seed);
  for (const x of moves) {
    if (g.ended || !Number.isFinite(x) || x < MIN_X || x > MAX_X) throw Error('Invalid moves');
    step(g, x);
  }
  if (!g.ended) throw Error('Incomplete game');
  return g;
}
