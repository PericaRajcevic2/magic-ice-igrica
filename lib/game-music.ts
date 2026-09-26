// A pre-rendered loop keeps note scheduling and synthesis off the game thread.
export class GameMusic {
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode;
  private offset=0;
  private started=0;
  private wanted=false;
  private disposed=false;
  private context: AudioContext;
  constructor(context: AudioContext) {
    this.context=context;
    this.gain=context.createGain();
    this.gain.gain.value=0;
    this.gain.connect(context.destination);
  }
  async load(bytes: ArrayBuffer) {
    const buffer=await this.context.decodeAudioData(bytes.slice(0));
    if(this.disposed) return;
    this.buffer=buffer;
    if(this.wanted) this.play();
  }
  play() {
    if(this.disposed) return;
    this.wanted=true;
    if(!this.buffer||this.source) return;
    const a=this.context, source=a.createBufferSource();
    source.buffer=this.buffer; source.loop=true; source.connect(this.gain);
    this.gain.gain.cancelScheduledValues(a.currentTime);
    this.gain.gain.setValueAtTime(0,a.currentTime);
    this.gain.gain.linearRampToValueAtTime(.055,a.currentTime+.12);
    this.started=a.currentTime; this.source=source;
    source.onended=()=>source.disconnect();
    source.start(0,this.offset);
  }
  pause() {
    this.wanted=false;
    if(!this.source) return;
    const now=this.context.currentTime;
    this.offset=(this.offset+now-this.started)%(this.buffer?.duration||1);
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setTargetAtTime(0,now,.008);
    this.source.stop(now+.04); this.source=null;
  }
  reset() { this.pause(); this.offset=0; }
  dispose() { this.reset(); this.disposed=true; this.gain.disconnect(); }
}
