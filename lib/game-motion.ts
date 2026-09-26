import type { Game } from './game';

export const STEP_MS = 1000 / 60;
export type MotionFrame = { tick: number; x: number; velocity: number; drops: Map<number, number> };
export function createMotionFrame(): MotionFrame {
  return { tick: 0, x: 210, velocity: 0, drops: new Map() };
}
export function captureMotion(g: Game, frame: MotionFrame) {
  frame.tick = g.tick; frame.x = g.x; frame.velocity = g.velocity;
  frame.drops.clear();
  for (const d of g.drops) frame.drops.set(d.id, d.y);
}
export function blend(previous: number, current: number, alpha: number) {
  return previous + (current - previous) * Math.max(0, Math.min(1, alpha));
}
// Presentation only: never feed interpolated coordinates into scoring or replay.
export function motionView(g: Game, previous?: MotionFrame, alpha = 1): Game {
  if (!previous || previous.tick !== g.tick - 1 || g.ended) return g;
  return { ...g, tick: blend(previous.tick, g.tick, alpha), x: blend(previous.x, g.x, alpha), velocity: blend(previous.velocity, g.velocity, alpha) };
}
