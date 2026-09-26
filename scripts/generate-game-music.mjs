import fs from 'node:fs';

// Original eight-bar theme: soft music-box melody, plucked chords and bass.
// Render once here; gameplay only plays a single looping audio buffer.
const rate=22050, beat=60/110, length=32*beat, data=new Float64Array(Math.round(rate*length));
const hz=n=>440*2**((n-69)/12);
function note(midi,at,duration,volume,kind='bell') {
  const start=Math.round(at*rate), samples=Math.ceil(duration*rate), f=hz(midi);
  for(let i=0;i<samples;i++) {
    const t=i/rate, attack=Math.min(1,t/.009), release=Math.min(1,(duration-t)/.055);
    const env=attack*Math.max(0,release)*Math.exp(-t/(kind==='bass'?.42:.24));
    const wave=Math.sin(2*Math.PI*f*t)+(kind==='bell'?.22*Math.sin(2*Math.PI*f*2*t)*Math.exp(-t*9):.1*Math.sin(2*Math.PI*f*2*t));
    data[(start+i)%data.length]+=wave*env*volume;
  }
}
const chords=[[48,60,64,67],[45,60,64,69],[41,60,65,69],[43,59,62,67]];
const melody=[
  [76,79,81,79,76,null,74,72], [76,79,84,null,83,79,76,null],
  [77,81,79,77,76,null,74,72], [74,79,83,81,79,null,74,null],
  [76,79,81,84,83,79,76,null], [76,81,84,83,81,null,79,76],
  [77,81,79,76,77,null,74,72], [74,76,79,83,79,null,74,null],
];
for(let bar=0;bar<8;bar++) {
  const c=chords[bar%4];
  for(let b=0;b<4;b++) {
    note(c[0]+(b===2?12:0),(bar*4+b)*beat,.7,.22,'bass');
    for(const pitch of c.slice(1)) note(pitch,(bar*4+b+.5)*beat,.42,.065,'pluck');
  }
  melody[bar].forEach((pitch,i)=>{if(pitch!==null)note(pitch,(bar*4+i*.5)*beat,.8,i%2?.26:.32);});
}
const peak=data.reduce((n,x)=>Math.max(n,Math.abs(x)),0), pcm=Buffer.alloc(data.length*2);
data.forEach((x,i)=>pcm.writeInt16LE(Math.round(x/peak*.8*32767),i*2));
const header=Buffer.alloc(44);
header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);
header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);
header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);
header.write('data',36);header.writeUInt32LE(pcm.length,40);
fs.writeFileSync('public/assets/magic-ice-theme.wav',Buffer.concat([header,pcm]));
console.log(`Original loop: ${length.toFixed(2)} s, mono ${rate} Hz, ${pcm.length+44} bytes.`);
