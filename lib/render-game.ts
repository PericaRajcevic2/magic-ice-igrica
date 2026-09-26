import { blend, motionView, type MotionFrame } from './game-motion';
import { WIDTH, HEIGHT, spacing, sway, top, catcherX, type Game } from './game';

const rects = [[48,58,430,384],[560,58,430,384],[1070,58,430,384],[45,535,445,410],[638,505,272,455],[1060,549,430,420]];

type Graphics = { sprites: HTMLCanvasElement[]; bonuses: HTMLCanvasElement[] };
const graphics = new WeakMap<HTMLImageElement, Graphics>();
function surface(w: number, h: number) {
  const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
  return canvas;
}
export function prepareGameGraphics(atlas: HTMLImageElement) {
  if (graphics.has(atlas)) return;
  const sprites = rects.map((r, kind) => {
    const c=surface(kind===4?164:224,kind===4?272:200), ctx=c.getContext('2d')!;
    ctx.drawImage(atlas,r[0],r[1],r[2],r[3],0,0,c.width,c.height); return c;
  });
  const bonuses = [0,1,2,3].map(variant => {
    const c=surface(216,232), ctx=c.getContext('2d')!, fruit=variant<3;
    ctx.scale(2,2); ctx.translate(54,54);
      const accent = fruit ? '#cd347a' : '#087f86';

      ctx.save();
      const glow = ctx.createRadialGradient(0, 0, 15, 0, 0, 49);
      glow.addColorStop(0, fruit ? '#ff71b799' : '#40e9d699'); glow.addColorStop(1, '#ffffff00');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 49, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fruit ? '#fff1f8' : '#e3fffa'; ctx.strokeStyle = fruit ? '#ef79b1' : '#3bbfaf'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (fruit) {
        ctx.font = '43px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(['🍓', '🍒', '🍊'][variant], 0, 2);
      } else {
        // Functional clock symbol, kept legible at mobile scale.
        ctx.strokeStyle = accent; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 2, 19, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, -24); ctx.lineTo(5, -24); ctx.moveTo(0, -24); ctx.lineTo(0, -18); ctx.moveTo(0, -9); ctx.lineTo(0, 2); ctx.lineTo(8, 7); ctx.stroke();
      }
      ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(-35, 29, 70, 23, 10); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fruit ? '+150' : '+2 s', 0, 40);

    ctx.restore(); return c;
  });
  graphics.set(atlas,{sprites,bonuses});
}

export function sprite(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, kind: number, x: number, y: number, w: number, h: number) {
  const cached=graphics.get(atlas)?.sprites[kind];
  if (cached) { ctx.drawImage(cached,x-w/2,y-h/2,w,h); return; }
  const r = rects[kind];
  ctx.drawImage(atlas, r[0], r[1], r[2], r[3], x - w / 2, y - h / 2, w, h);
}
export function drawGame(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement, g: Game, options: { idle?: boolean; time?: number; reduced?: boolean; clean?: boolean; previous?: MotionFrame; alpha?: number } = {}) {
  prepareGameGraphics(atlas);
  const current=g;
  g=motionView(current,options.previous,options.alpha);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const { idle = false, time = 0, reduced = false, clean = false } = options;
  if (idle) {
    ctx.save(); ctx.translate(210, 315); ctx.rotate(-.065); ctx.scale(.88, .88);
    sprite(ctx, atlas, 4, 0, 111, 81, 136);
    [2, 1, 0, 3].forEach((k, i) => sprite(ctx, atlas, k, reduced ? 0 : Math.sin(time / 1000 + i * .5) * 4, 48 - i * 47, 106, 95));
    ctx.restore(); return;
  }
  ctx.fillStyle = '#126bb31c'; ctx.beginPath(); ctx.ellipse(g.x, 565, 41, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (!clean && !g.ended) {
    ctx.strokeStyle = '#176aac28'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.moveTo(catcherX(g), 28); ctx.lineTo(catcherX(g), top(g) - 35); ctx.stroke(); ctx.setLineDash([]);
  }
  sprite(ctx, atlas, 4, g.x, 509, 66, 111);
  g.stack.forEach((kind, i) => {
    const age = Math.max(0, g.tick - g.landed[i]);
    const squash = reduced || age > 28 ? 0 : Math.sin(age * .34) * Math.exp(-age / 9) * .2;
    sprite(ctx, atlas, kind, g.x + sway(g, i), 451 - i * spacing(g), 65 * (1 + squash), 59 * (1 - squash));
  });
  if (clean) return;
  for (const d of g.drops) {
    const previousY=g!==current?options.previous?.drops.get(d.id):undefined;
    const y=previousY===undefined?d.y:blend(previousY,d.y,options.alpha??1);
    if (d.kind === 6 || d.kind === 7) {
      const image=graphics.get(atlas)?.bonuses[d.kind===7?3:d.id%3];
      if (image) {
        const pulse=reduced?1:1+Math.sin(g.tick/9+d.id)*.025;
        ctx.drawImage(image,d.x-54*pulse,y-54*pulse,108*pulse,116*pulse);
      }
      continue;
    }
    if (d.kind === 3 || d.kind === 5) {
      ctx.save(); ctx.strokeStyle = d.kind === 3 ? '#ffca46' : '#c84783'; ctx.globalAlpha = .7; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, y, 33 + (reduced ? 0 : Math.sin(g.tick / 8) * 2), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      ctx.font = '800 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = d.kind === 3 ? '#895a08' : '#a52261';
      ctx.fillText(d.kind === 3 ? '+500' : 'IZBJEGNI', d.x, y - 39);
    }
    sprite(ctx, atlas, d.kind, d.x, y, 63, 57);
  }
  for (const e of g.events) {
    const age = Math.max(0, g.tick - e.tick), fade = Math.min(1, (62 - age) / 20);
    if (e.type !== 'hurt' && !reduced) {
      ctx.save(); ctx.globalAlpha = fade;
      const colors = e.type === 'time' ? ['#13ae9e', '#8bffe4', '#fff'] : e.type === 'fruit' ? ['#e94c99', '#ffc0dd', '#fff'] : e.type === 'gold' || e.type === 'combo' ? ['#ffc943', '#fff3a8'] : ['#ee79ab', '#56b8ef', '#fff'];
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4 + e.id, distance = age * .85;
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(e.x + Math.cos(angle) * distance, e.y + Math.sin(angle) * distance - age * .55, 3, 6);
      }
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = fade; ctx.textAlign = 'center';
    ctx.font = `${e.type === 'combo' ? 900 : 800} ${e.type === 'combo' ? 21 : 16}px system-ui`;
    ctx.fillStyle = e.type === 'hurt' || e.type === 'fruit' ? '#af2860' : e.type === 'time' ? '#087f86' : e.type === 'gold' || e.type === 'combo' ? '#946108' : '#075cac';
    const labelWidth = ctx.measureText(e.label).width;
    const x = Math.max(labelWidth / 2 + 8, Math.min(WIDTH - labelWidth / 2 - 8, e.x));
    const y = Math.max(24, e.y - 46 - (reduced ? 0 : age * .36));
    ctx.lineWidth = 5; ctx.strokeStyle = '#f1fbff'; ctx.lineJoin = 'round'; ctx.strokeText(e.label, x, y); ctx.fillText(e.label, x, y); ctx.restore();
  }
}
