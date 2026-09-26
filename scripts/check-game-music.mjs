import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameMusic} from '../lib/game-music.ts';

function context() {
  const a={currentTime:0,destination:{},sources:[],decodeAudioData:async()=>({duration:16}),createGain:()=>({gain:{value:0,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){}})};
  a.createBufferSource=()=>{const s={connect(){},disconnect(){},start(when,offset){this.offset=offset;},stop(when){this.stopped=when;}};a.sources.push(s);return s;};
  return a;
}
const a=context(), music=new GameMusic(a);
await music.load(new ArrayBuffer(1));
assert.equal(a.sources.length,0); // Loading is silent.
music.play(); music.play();assert.equal(a.sources.length,1);assert.equal(a.sources[0].loop,true);
a.currentTime=5;music.pause();assert.equal(a.sources[0].stopped,5.04);
a.currentTime=12;music.play();assert.equal(a.sources[1].offset,5); // Pause keeps musical position.
music.reset();music.play();assert.equal(a.sources[2].offset,0); // New game begins at the first bar.
music.dispose();music.play();assert.equal(a.sources.length,3);
const b=context(), late=new GameMusic(b);late.play();late.pause();await late.load(new ArrayBuffer(1));assert.equal(b.sources.length,0);
const c=context(), disposed=new GameMusic(c);disposed.play();disposed.dispose();await disposed.load(new ArrayBuffer(1));assert.equal(c.sources.length,0);
const bytes=fs.readFileSync('public/assets/magic-ice-theme.wav');
assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt32LE(24),22050);
assert.equal(bytes.readUInt32LE(40),bytes.length-44);
let peak=0,squared=0;for(let i=44;i<bytes.length;i+=2){const n=bytes.readInt16LE(i);peak=Math.max(peak,Math.abs(n));squared+=n*n;}
assert.ok(peak<32767&&peak>20000);assert.ok(Math.sqrt(squared/((bytes.length-44)/2))>1000);
assert.ok(Math.abs(bytes.readInt16LE(44)-bytes.readInt16LE(bytes.length-2))<1000);
console.log('PASS: quiet loading, one loop, pause/resume, restart, delayed load, disposal; valid unclipped seamless WAV.');
