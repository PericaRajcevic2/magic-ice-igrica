"use client";
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowLeftRight, ArrowRight, Volume2, VolumeX, Pause, Play, Heart, Trophy, RotateCcw, Share2, Download, Star, Sparkles, ChevronRight, Crosshair, Check, LoaderCircle, Timer } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { createGame, step, WIDTH, HEIGHT, MIN_X, MAX_X, GAME_VERSION, type Game, type CatchEvent } from '@/lib/game';
import { drawGame, prepareGameGraphics } from '@/lib/render-game';
import { STEP_MS, createMotionFrame, captureMotion } from '@/lib/game-motion';
import { GameMusic } from '@/lib/game-music';

type Entry = { name:string; score:number; scoops:number; id:string };
type Mode = 'start' | 'playing' | 'end';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
const fmt = (n:number) => n.toLocaleString('hr-HR');
const snapshot = (g:Game) => ({ score:g.score,lives:g.lives,count:g.stack.length,time:Math.max(0,Math.ceil((g.duration-g.tick)/60)),duration:g.duration/60,streak:g.streak,perfects:g.perfects,bestStreak:g.bestStreak,base:g.baseScore,precision:g.perfectScore,combo:g.comboScore,golds:g.golds,fruits:g.fruits,timeBonuses:g.timeBonuses });
const scoopWord = (n:number, accusative=false) => n % 10 === 1 && n % 100 !== 11 ? (accusative?'kuglicu':'kuglica') : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'kuglice' : 'kuglica';
async function jsonRequest<T>(url:string, init?:RequestInit):Promise<T> {
  const response = await fetch(url,{ ...init,signal:AbortSignal.timeout(12000) });
  if (!response.ok) throw Error('Request failed');
  return response.json() as Promise<T>;
}
export default function Home() {
  const canvas = useRef<HTMLCanvasElement>(null), board = useRef<HTMLElement>(null);
  const atlas = useRef<HTMLImageElement|null>(null), logo = useRef<HTMLImageElement|null>(null);
  const game = useRef<Game>(createGame(1)), target = useRef(WIDTH/2), moves = useRef<number[]>([]);
  const running = useRef(false), pausedRef = useRef(false), countdown = useRef(0), endAt = useRef(0);
  const soundRef = useRef(true), audio = useRef<AudioContext|null>(null), keys = useRef({ left:false,right:false });
  const music=useRef<GameMusic|null>(null), musicBytes=useRef<Promise<ArrayBuffer|null>|null>(null), effectsGain=useRef<GainNode|null>(null);
  const run = useRef(''), pointer = useRef<{ id:number;x:number;target:number }|null>(null), starting = useRef(false);
  const [mode,setMode] = useState<Mode>('start'), [hud,setHud] = useState(snapshot(game.current));
  const [sound,setSound] = useState(true), [paused,setPaused] = useState(false), [count,setCount] = useState(0);
  const [loading,setLoading] = useState(false), [ready,setReady] = useState(false), [assetError,setAssetError] = useState(false);
  const [error,setError] = useState(''), [name,setName] = useState(''), [published,setPublished] = useState(false);
  const [saveState,setSaveState] = useState<SaveState>('idle'), [publishing,setPublishing] = useState(false);
  const [best,setBest] = useState<number|null>(null), [newRecord,setNewRecord] = useState(false);
  const [period,setPeriod] = useState('all'), [entries,setEntries] = useState<Entry[]>([]), [boardStatus,setBoardStatus] = useState('loading');
  const [refresh,setRefresh] = useState(0), [notice,setNotice] = useState(''), [sharing,setSharing] = useState(false);
  const [reaction,setReaction] = useState<{ kind:string;text:string;id:number }>({ kind:'idle',text:'Hajdemo složiti nešto čarobno.',id:0 });
  const [hit,setHit] = useState(-1), [scorePulse,setScorePulse] = useState(-1), [timePulse,setTimePulse] = useState(-1);

  function prepareMusic() {
    return musicBytes.current ?? (musicBytes.current=fetch('/assets/magic-ice-theme.wav').then(r=>r.ok?r.arrayBuffer():null).catch(()=>null));
  }
  function getAudio() {
    const a=audio.current ?? (audio.current=new AudioContext());
    if(a.state==='suspended') void a.resume().catch(()=>{});
    if(!effectsGain.current) {
      const gain=a.createGain(); gain.gain.value=soundRef.current?1:0; gain.connect(a.destination); effectsGain.current=gain;
      const theme=new GameMusic(a); music.current=theme;
      void prepareMusic().then(bytes=>bytes?theme.load(bytes):undefined).catch(()=>{});
    }
    return a;
  }
  function toggleSound() {
    const next=!soundRef.current; soundRef.current=next; setSound(next);
    try {
      if(next) getAudio(); else music.current?.pause();
      if(audio.current&&effectsGain.current) effectsGain.current.gain.setTargetAtTime(next?1:0,audio.current.currentTime,.008);
      localStorage.setItem('magic-muted',String(!next));
    } catch {}
  }
  function tone(hz:number, delay=0, duration=.16, type:OscillatorType='sine', endHz=hz*1.13, volume=.045) {
    if (!soundRef.current) return;
    try {
      const a = getAudio();
      const o = a.createOscillator(), v = a.createGain(), t = a.currentTime + delay;
      o.type = type; o.frequency.setValueAtTime(hz,t); o.frequency.exponentialRampToValueAtTime(endHz,t+duration);
      v.gain.setValueAtTime(.0001,t); v.gain.exponentialRampToValueAtTime(volume,t+.008); v.gain.exponentialRampToValueAtTime(.0001,t+duration);
      o.connect(v); v.connect(effectsGain.current!); o.start(t); o.stop(t+duration+.02);
      o.onended=()=>{o.disconnect();v.disconnect();};
    } catch {}
  }
  function feedback(e:CatchEvent) {
    if (e.type === 'hurt') {
      tone(155,0,.24,'triangle'); setHit(e.id);
      setReaction({ kind:'oops',text:game.current.lives === 1 ? 'Još jedan život. Možeš ti to!' : 'Nema veze. Hvataj sljedeću!',id:e.id });
    } else if (e.type === 'time') {
      [392,587,784,1047].forEach((n,i)=>tone(n,i*.065,.2,'triangle',n,.035));
      setTimePulse(e.id); setReaction({kind:'cheer',text:'Još 2 sekunde čarolije. Hvataj!',id:e.id});
      setTimeout(()=>setTimePulse(current=>current===e.id?-1:current),1600);
    } else {
      setScorePulse(e.id);
      if (e.type === 'gold' || e.type === 'combo') { [660,880,1100].forEach((n,i)=>tone(n,i*.07)); setReaction({ kind:'cheer',text:e.type === 'gold' ? 'To je ta zlatna čarolija!' : `${game.current.streak} zaredom. Bravo!`,id:e.id }); }
      else if (e.type === 'fruit') {
        // Bright, ascending three-note chime, distinct from the scoop's soft pop.
        [880,1175,1568].forEach((n,i)=>{tone(n,i*.055,.22,'sine',n,.055);tone(n*2,i*.055,.12,'sine',n*2,.012);});
        setReaction({kind:'cheer',text:['Voćna čarolija! +150 za tebe.','Sočno! Samo tako nastavi.','To je bio sladak bonus!'][game.current.fruits%3],id:e.id});
      } else {
        tone(650,0,.12,'sine',230,.08);
        if (e.type === 'perfect') {tone(1320,.035,.12,'sine',1320,.025);setReaction({kind:'cheer',text:'Ravno u sredinu!',id:e.id});}
      }
    }
  }
  function pause() { if (!running.current) return; pausedRef.current = !pausedRef.current; keys.current = { left:false,right:false }; pointer.current=null; setPaused(pausedRef.current); if(pausedRef.current) music.current?.pause(); else if(soundRef.current) { try { getAudio(); } catch {} } }
  async function loadAssets() {
    setAssetError(false); setReady(false);
    void prepareMusic();
    try {
      const a = new Image(), l = new Image(), p = new Image(); a.src='/assets/ice-cream-sprite-atlas.png'; l.src='/assets/logo-web.webp'; p.src='/assets/penguin-web.webp';
      await Promise.all([a.decode(),l.decode(),p.decode()]); prepareGameGraphics(a); atlas.current=a; logo.current=l; setReady(true);
    } catch { setAssetError(true); }
  }
  async function persist(id:string, history:number[], nickname?:string) {
    if (nickname === undefined) setSaveState('saving');
    const data = await jsonRequest<{best:number;isRecord:boolean;published:boolean}>('/api/round/finish',{ method:'POST',headers:{ 'Content-Type':'application/json' },body:JSON.stringify({ id,moves:history,...(nickname !== undefined ? { name:nickname } : {}) }) });
    if (run.current === id) {
      setSaveState('saved'); setBest(data.best); setNewRecord(data.isRecord); setPublished(data.published);
      if (data.published) setRefresh(v=>v+1);
    }
  }
  async function retrySave() {
    setError('');
    try { await persist(run.current,moves.current.slice()); } catch { setSaveState('error'); }
  }
  useEffect(()=>{
    void loadAssets();
    try { const muted=localStorage.getItem('magic-muted')==='true'; soundRef.current=!muted; setSound(!muted); } catch {}
    void jsonRequest<{best:number}>('/api/personal').then(data=>setBest(data.best)).catch(()=>setBest(null));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const previous=createMotionFrame();
    let frame=0,last=0,acc=0,lastHud='',lastCount=0,lastSecond=35,lastDraw=0;
    let drawnGame:Game|null=null,drawnAtlas:HTMLImageElement|null=null,drawnTick=-1;
    function draw(ts:number) {
      const c=canvas.current, ctx=c?.getContext('2d');
      if (!c || !ctx) return;
      const dt=last ? Math.min(ts-last,100) : 0; last=ts;
      if (running.current && !pausedRef.current) {
        if (countdown.current > 0) {
          countdown.current=Math.max(0,countdown.current-dt);
          const number=Math.ceil(countdown.current/1000);
          if (number !== lastCount) { lastCount=number; setCount(number); tone(number ? 440 : 880,0,.13); }
          acc=0;
          lastSecond=35;
        } else {
          acc+=dt;
          while (acc+1e-7>=STEP_MS && !game.current.ended) {
            if (keys.current.left) target.current-=5.8;
            if (keys.current.right) target.current+=5.8;
            target.current=Math.max(MIN_X,Math.min(MAX_X,target.current));
            const serial=game.current.eventSerial;
            captureMotion(game.current,previous);
            moves.current.push(target.current); step(game.current,target.current);
            game.current.events.filter(e=>e.id>=serial).forEach(feedback);
            acc=Math.max(0,acc-STEP_MS);
          }
          const g=game.current;
          const remaining=Math.ceil((g.duration-g.tick)/60);
          if(remaining!==lastSecond){lastSecond=remaining;if(remaining>0&&remaining<=5)tone(360,0,.06,'triangle',360,.022);}
          const hudKey=remaining+':'+g.eventSerial;
          if (hudKey!==lastHud) { lastHud=hudKey; setHud(snapshot(g)); }
          if (g.ended) {
            running.current=false; endAt.current=ts+650; setHud(snapshot(g));
            setReaction({ kind:'cheer',text:g.stack.length>=15 ? 'Kakav toranj! Još jednu?' : 'Sljedeći rekord je nadohvat ruke.',id:g.eventSerial+1 });
            [523,659,784].forEach((n,i)=>tone(n,i*.09,.25));
            const id=run.current;
            void persist(id,moves.current.slice()).catch(()=>{ if (run.current===id) setSaveState('error'); });
          }
        }
      } else if (!running.current) { acc=0; lastHud=''; }
      if (endAt.current && ts>=endAt.current) { endAt.current=0; setMode('end'); }
      const g=game.current, idle=!running.current&&!g.ended;
      const moving=running.current&&!pausedRef.current&&countdown.current===0;
      if(moving&&soundRef.current&&!document.hidden) music.current?.play(); else music.current?.pause();
      const changed=drawnGame!==g||drawnAtlas!==atlas.current||drawnTick!==g.tick;
      if (atlas.current && !document.hidden && (changed||moving||(idle&&!reduced.matches&&ts-lastDraw>=1000/30))) {
        ctx.setTransform(2,0,0,2,0,0);
        drawGame(ctx,atlas.current,g,{idle,time:ts,reduced:reduced.matches,clean:g.ended,previous,alpha:acc/STEP_MS});
        drawnGame=g; drawnAtlas=atlas.current; drawnTick=g.tick; lastDraw=ts;
      }
      frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
    const down=(e:KeyboardEvent)=>{
      if ((e.target as HTMLElement).closest('input,button,a') || !running.current) return;
      if (['ArrowLeft','ArrowRight',' ','Escape'].includes(e.key)) e.preventDefault();
      if (e.key==='ArrowLeft'||e.key?.toLowerCase()==='a') keys.current.left=true;
      if (e.key==='ArrowRight'||e.key?.toLowerCase()==='d') keys.current.right=true;
      if ((e.key===' '||e.key==='Escape')&&!e.repeat) pause();
    };
    const up=(e:KeyboardEvent)=>{ if (e.key==='ArrowLeft'||e.key?.toLowerCase()==='a') keys.current.left=false; if (e.key==='ArrowRight'||e.key?.toLowerCase()==='d') keys.current.right=false; };
    const hide=()=>{ music.current?.pause(); if (running.current) { pausedRef.current=true; setPaused(true); keys.current={left:false,right:false}; pointer.current=null; } };
    const visibility=()=>{ if (document.hidden) hide(); };
    window.addEventListener('keydown',down); window.addEventListener('keyup',up); window.addEventListener('blur',hide); document.addEventListener('visibilitychange',visibility);
    return ()=>{ cancelAnimationFrame(frame); music.current?.dispose(); music.current=null; effectsGain.current?.disconnect(); effectsGain.current=null; if(audio.current) void audio.current.close().catch(()=>{}); audio.current=null; window.removeEventListener('keydown',down); window.removeEventListener('keyup',up); window.removeEventListener('blur',hide); document.removeEventListener('visibilitychange',visibility); };
  },[]);
  useEffect(()=>{
    let active=true; setBoardStatus('loading');
    jsonRequest<{entries:Entry[]}>('/api/leaderboard?period='+period).then(data=>{ if(active){setEntries(data.entries);setBoardStatus('ready');} }).catch(()=>{if(active)setBoardStatus('error');});
    return ()=>{active=false;};
  },[period,refresh]);
  useEffect(()=>{
    if (mode === 'start') return;
    if (mode === 'playing' && !paused) canvas.current?.focus({preventScroll:true});
    if (window.matchMedia('(max-width: 760px)').matches) board.current?.scrollIntoView({block:'start',behavior:'instant'});
  },[mode,paused]);

  async function start() {
    if (starting.current || !atlas.current) return;
    starting.current=true; setLoading(true); setError('');
    try {
      tone(440);
      const data=await jsonRequest<{id:string;seed:number;version:number}>('/api/round',{method:'POST'});
      if(data.version!==GAME_VERSION) throw Error('Version mismatch');
      run.current=data.id; game.current=createGame(data.seed); moves.current=[]; target.current=WIDTH/2;
      music.current?.reset();
      keys.current={left:false,right:false}; pointer.current=null; pausedRef.current=false; endAt.current=0;
      setPaused(false); setPublished(false); setSaveState('idle'); setNotice(''); setNewRecord(false); setHit(-1); setScorePulse(-1); setTimePulse(-1);
      setReaction({kind:'idle',text:'Pomiči kornet. Ja navijam!',id:0}); setHud(snapshot(game.current));
      countdown.current=3000; setCount(3); setMode('playing'); running.current=true;
      if(window.matchMedia('(max-width: 760px)').matches) board.current?.scrollIntoView({block:'start',behavior:'instant'});
      canvas.current?.focus({preventScroll:true});
    } catch { setError('Igra se nije uspjela pokrenuti. Pokušaj ponovno.'); }
    finally { setLoading(false); starting.current=false; }
  }
  async function publish() {
    if(!/^[\p{L}\p{N} _.-]{2,18}$/u.test(name.trim())) { setError('Nadimak treba imati 2–18 slova, brojeva ili razmaka.'); return; }
    setPublishing(true); setError('');
    try { await persist(run.current,moves.current.slice(),name.trim()); } catch { setError('Objava nije uspjela. Tvoj nadimak je sačuvan — pokušaj ponovno.'); }
    finally { setPublishing(false); }
  }
  async function card(download=false,story=false) {
    if(sharing) return; setSharing(true); setNotice('');
    try {
      if(!atlas.current||!logo.current) throw Error('Missing image');
      const c=document.createElement('canvas'); c.width=1080; c.height=story?1920:1350;
      const x=c.getContext('2d')!, H=c.height;
      const bg=x.createLinearGradient(0,0,1080,H); bg.addColorStop(0,'#e7f8ff'); bg.addColorStop(1,'#b8e8fb'); x.fillStyle=bg; x.fillRect(0,0,1080,H);
      x.strokeStyle='#ffffff88'; x.lineWidth=2; for(let i=0;i<8;i++){x.beginPath();x.arc(540,H*.5,220+i*72,0,Math.PI*2);x.stroke();}
      const logoScale=logo.current.naturalWidth/5906;
      x.drawImage(logo.current,1190*logoScale,1820*logoScale,4060*logoScale,2270*logoScale,340,story?125:36,400,224);
      x.textAlign='center'; x.fillStyle='#095caf'; x.font='900 45px system-ui'; x.fillText('STACK THE MAGIC',540,story?410:303);
      x.font='600 32px system-ui';x.fillText('Moj Magic Ice ima',540,story?492:370);
      x.font='900 79px system-ui';x.fillText(hud.count+' '+scoopWord(hud.count,true)+'!',540,story?590:466);
      const tower=document.createElement('canvas');tower.width=840;tower.height=1200;const tx=tower.getContext('2d')!;tx.scale(2,2);
      const still={...game.current,x:WIDTH/2,velocity:0};drawGame(tx,atlas.current,still,{clean:true,reduced:true});
      const towerH=story?890:600,towerW=towerH*WIDTH/HEIGHT;
      x.drawImage(tower,(1080-towerW)/2,story?610:485,towerW,towerH);
      x.fillStyle='#075bac';x.font='900 76px system-ui';x.fillText(fmt(hud.score)+' bodova',540,story?1660:1170);
      x.font='600 31px system-ui';x.fillText('Možeš li složiti više?',540,story?1740:1243);
      const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('Export failed');
      const file=new File([blob],story?'magic-ice-story.png':'magic-ice-rezultat.png',{type:'image/png'});
      if(!download&&navigator.canShare?.({files:[file]})) await navigator.share({files:[file],title:'Moj Magic Ice rezultat',text:`Složio sam ${hud.count} ${scoopWord(hud.count,true)} Magic Ice čarolije! ${fmt(hud.score)} bodova.`});
      else {const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice(story?'Story kartica je preuzeta.':'Kartica rezultata je preuzeta. Podijeli je s ekipom!');}
    } catch(e) {if((e as Error).name!=='AbortError')setNotice('Kartica se nije uspjela izraditi. Pokušaj ponovno.');}
    finally {setSharing(false);}
  }
  function canvasMetrics(){const r=canvas.current!.getBoundingClientRect(),scale=Math.min(r.width/WIDTH,r.height/HEIGHT);return{left:r.left+(r.width-WIDTH*scale)/2,scale};}
  function pointerDown(e:PointerEvent<HTMLCanvasElement>){
    if(!running.current||pausedRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId); pointer.current={id:e.pointerId,x:e.clientX,target:target.current};
    if(e.pointerType==='mouse'){const m=canvasMetrics();target.current=(e.clientX-m.left)/m.scale;}
  }
  function pointerMove(e:PointerEvent<HTMLCanvasElement>){
    if(!running.current||pausedRef.current) return;
    const m=canvasMetrics();
    if(e.pointerType==='mouse') target.current=(e.clientX-m.left)/m.scale;
    else if(pointer.current?.id===e.pointerId) target.current=pointer.current.target+(e.clientX-pointer.current.x)/m.scale;
    target.current=Math.max(MIN_X,Math.min(MAX_X,target.current));
  }
  const active=mode==='playing', urgent=active&&hud.time<=10&&!count;
  return <div className={'site-shell '+(active?'is-playing':'')}>
    <header className="topbar"><a href="/" className="brand" aria-label="Magic Ice početna"><img src="/assets/logo-web.webp" alt="Magic Ice"/></a><span className="header-note">MALA IGRA. VELIKA ČAROLIJA.</span><button className="round-btn" aria-label={sound?'Isključi zvuk':'Uključi zvuk'} title={sound?'Isključi muziku i zvukove':'Uključi muziku i zvukove'} aria-pressed={sound} onClick={toggleSound}>{sound?<Volume2 size={20}/>:<VolumeX size={20}/>}</button></header>
    <main><div className="section-bar"><div className="game-label"><Sparkles size={17}/> MAGIC ICE STACK</div><span className="personal-best"><Trophy size={15}/> Tvoj rekord <strong>{best===null?'—':fmt(best)}</strong></span></div>
      <div className="arcade-layout">
        <section ref={board} className={'game-board '+(active?'active-game ':'')+(urgent?'final-seconds':'')} aria-label="Magic Ice Stack igra">
          <div className="hud"><div><span>BODOVI</span><strong key={scorePulse} className={scorePulse>=0?'score-pop':''}>{fmt(hud.score)}</strong></div><div className={'timer '+(urgent?'urgent':'')}><span>VRIJEME {hud.timeBonuses>0&&<em>+{hud.timeBonuses*2}</em>}</span><strong key={timePulse} className={timePulse>=0?'time-pop':''}>{String(hud.time).padStart(2,'0')}<small>s</small></strong></div><div className="life-box"><span>ŽIVOTI</span><div key={hit} className={'hearts '+(hit>=0?'heart-hit':'')} aria-label={`${hud.lives} života`}>{[0,1,2].map(i=><Heart key={i} size={20} fill={i<hud.lives?'currentColor':'none'} className={i<hud.lives?'':'lost'}/>)}</div></div>{active&&<button className="pause-btn" onClick={pause} aria-label={paused?'Nastavi igru':'Pauziraj igru'}>{paused?<Play size={18}/>:<Pause size={18}/>}</button>}</div>
          {active&&<div className="round-progress" aria-hidden="true"><i style={{width:(hud.time/hud.duration*100)+'%'}}/></div>}
          {active&&!paused&&timePulse>=0&&<div className="time-toast" key={timePulse} role="status"><Timer size={18}/> +2 SEKUNDE!</div>}
          <div className="stage"><canvas ref={canvas} width={WIDTH*2} height={HEIGHT*2} tabIndex={0} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}} onLostPointerCapture={()=>{pointer.current=null;}} aria-label="Igra: vodi kornet prstom, mišem ili strelicama. Uhvati kuglice, izbjegni ljubičaste otopljene kuglice. Razmak ili Escape pauzira igru."/></div>
          {mode==='start'&&<div className="start-screen"><div className="start-title"><span className="eyebrow">KOLIKO KUGLICA MOŽEŠ SLOŽITI?</span><h1>STACK<br/>THE <em>MAGIC.</em></h1></div><div className="start-controls"><p>Pomakni kornet. Uhvati čaroliju.</p><button className="primary play-button" onClick={start} disabled={loading||!ready}>{loading||!ready&&!assetError?<LoaderCircle className="spin" size={20}/>:<Play size={20} fill="currentColor"/>}{loading?'PRIPREMAMO…':!ready?'UČITAVAMO…':'IGRAJ'}<ArrowRight size={21}/></button><span className="start-hint"><ArrowLeftRight size={17}/> Prstom, mišem ili strelicama · 35 s</span>{assetError&&<p className="error" role="alert">Grafike nisu učitane. <button className="inline-link" onClick={loadAssets}>Pokušaj ponovno</button></p>}{error&&<p className="error" role="alert">{error}</p>}</div></div>}
          {active&&!paused&&count>0&&<div className="countdown" role="status"><span>PRIPREMI KORNET</span><div className="countdown-moment"><div className="moment-penguin countdown-penguin"><img src="/assets/penguin-web.webp" alt="Magic Ice pingvin"/></div><strong key={count}>{count}</strong></div><p className="penguin-speech" key={'speech-'+count}>{count===3?'Spreman? Ja navijam!':count===2?'Klizi lijevo–desno.':'Uhvatimo čaroliju!'}</p><div className="countdown-bonuses"><span>🍓 +150</span><span><Timer size={17}/> +2 s</span></div></div>}
          {active&&!count&&<><div className="in-game-stats"><div className="stack-count"><strong>{hud.count}</strong><span>kuglica</span></div><div className="streak-count"><span>{hud.streak>=5?`${hud.streak} U NIZU`:'DO BONUSA +200'}</span><div className="streak-dots" aria-label={`${hud.streak%5} od 5 do sljedećeg bonusa`}>{[0,1,2,3,4].map(i=><i key={i} className={i<hud.streak%5?'filled':''}/>)}</div></div></div>{hud.count===0&&hud.time>30&&<div className="first-catch-hint">Uhvati kuglicu kornetom ↓</div>}</>}
          {active&&paused&&<div className="overlay pause-screen"><div className="pause-icon"><Pause size={30}/></div><span className="eyebrow">ČAROLIJA MOŽE PRIČEKATI</span><h2>Pauza za sladoled.</h2><p>Vrati se kad budeš spreman.</p><button className="primary" onClick={pause}>NASTAVI <Play size={19}/></button></div>}
          {mode==='end'&&<div className={'overlay results '+(newRecord?'record-result':'')} role="region" aria-label="Rezultat igre">
            <div className="result-welcome"><div className="moment-penguin result-penguin"><img src="/assets/penguin-web.webp" alt="Magic Ice pingvin slavi tvoj rezultat"/></div><p className="penguin-speech">{hud.count===0?'Još jednu? Možeš ti to!':newRecord?'Bravo! Novi rekord!':hud.count>=15?'Bravo, majstore kuglica!':'Bravo! Slatko odigrano.'}</p></div><span className="result-kicker"><Trophy size={15}/> {newRecord?'NOVI OSOBNI REKORD!':hud.count>=15?'ČAROBAN TORANJ!':'TVOJA MAGIC ICE ČAROLIJA'}</span>
            <h2>{hud.count}{' '}<span>{scoopWord(hud.count)}</span></h2><strong className="result-score">{fmt(hud.score)} <span>bodova</span></strong>
            <div className="result-details"><span><Crosshair size={17}/><b>{hud.perfects}</b> preciznih</span><span><Sparkles size={17}/><b>{hud.bestStreak}</b> najbolji niz</span></div>
            <div className="result-bonuses"><span title="Uhvaćeni voćni bonusi">🍓 {hud.fruits} voćnih</span><span><Star size={14}/> {hud.golds} zlatnih</span><span><Timer size={15}/> +{hud.timeBonuses*2} s</span></div>
            <details className="score-breakdown"><summary>Kako sam osvojio bodove?</summary><div><span>Kuglice i voće</span><b>{fmt(hud.base)}</b></div><div><span>Precizna hvatanja</span><b>+{fmt(hud.precision)}</b></div><div><span>Bonusi za niz</span><b>+{fmt(hud.combo)}</b></div></details>
            <p className="result-motivation">{newRecord?'Možeš li još jednu kuglicu više?':best!==null&&hud.score<best?`Još ${fmt(best-hud.score+1)} bodova do novog rekorda.`:'Nova runda. Novi bonusi. Novi rekord?'}</p>
            <div className="result-actions"><button className="primary" onClick={start} disabled={loading||saveState==='saving'||publishing}><RotateCcw size={18}/>{loading?'PRIPREMAMO…':'IGRAJ PONOVNO'}</button><button className="secondary" onClick={()=>card()} disabled={sharing}><Share2 size={18}/> PODIJELI REZULTAT</button></div>
            <div className="download-actions"><button className="text-button" onClick={()=>card(true)} disabled={sharing}><Download size={14}/> Slika</button><span>·</span><button className="text-button" onClick={()=>card(true,true)} disabled={sharing}><Download size={14}/> Story 9:16</button></div>
            <div className="save-status" aria-live="polite">{saveState==='saving'?<><LoaderCircle size={14} className="spin"/> Spremamo tvoj rezultat…</>:saveState==='saved'?<><Check size={15}/> Sačuvano za ovaj preglednik</>:saveState==='error'?<><span>Rezultat još nije spremljen.</span><button className="inline-link" onClick={retrySave}>Pokušaj ponovno</button></>:null}</div>
            <form className="save-form" onSubmit={e=>{e.preventDefault();void publish();}}>{published?<p className="saved"><Check size={16}/> Tvoj rezultat je na ljestvici!</p>:<><label htmlFor="player-name">Želiš svoj rezultat na ljestvici?</label><div><input id="player-name" autoComplete="nickname" maxLength={18} minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Tvoj nadimak" required/><button type="submit" disabled={publishing||saveState==='saving'||name.trim().length<2}>{publishing?'OBJAVLJUJEM…':'OBJAVI'}<ChevronRight size={17}/></button></div></>}</form>
            {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
          </div>}
          <div className="board-footer">{active?<><div className={"footer-penguin mascot-portrait "+reaction.kind}><img src="/assets/penguin-web.webp" alt=""/></div><span>{reaction.kind==="cheer"?reaction.text:reaction.kind==="oops"?reaction.text:"Klizi prstom bilo gdje u igri"}</span></>:<><span>3 ŽIVOTA</span><i/><span>35 s + BONUS</span><i/><span>TVOJ REKORD</span></>}</div>
        </section>
        <aside>
          <div className={'mascot-note '+reaction.kind}><div className="mascot-portrait"><img src="/assets/penguin-web.webp" alt="Magic Ice pingvin navija za tebe"/></div><p>{reaction.text}</p></div>
          <section className="how-to"><span className="eyebrow">MALA TAJNA VELIKOG REKORDA</span><h2>Hvataj. Slaži.<br/>{' '}<em>Ponovi.</em></h2>
            <div className="rule"><span className="rule-icon pink"><Crosshair/></span><p><strong>Svaki bod se računa</strong><span>Kuglica je <b>100</b>. Što bliže sredini, to veći bonus: <b>do +25 bodova.</b></span></p></div>
            <div className="rule"><span className="rule-icon yellow"><Sparkles/></span><p><strong>Uhvati ritam</strong><span>Svakih <b>5 hvatanja bez greške</b> donosi dodatnih <b>+200.</b></span></p></div>
            <div className="special-rules"><span><Star size={16}/><b>Zlatna</b> +500</span><span>🍓 <b>Voće</b> +150</span></div><div className="time-rule"><Timer size={24}/><p><strong>Uhvati još malo čarolije</strong><span>Satić daje <b>+2 sekunde</b>, do dva puta po rundi. Bonusi svaki put stižu drugačije.</span></p></div><p className="hazard-rule"><Heart size={16}/> Promašena ili otopljena kuglica = −1 život.</p><p className="bonus-hint">Promašeno voće i satić ne oduzimaju život.</p>
          </section>
          <section className="leaderboard"><div className="leader-title"><Trophy size={21}/><h2>Majstori kuglica</h2></div><Tabs value={period} onValueChange={setPeriod}><TabsList className="leader-tabs"><TabsTrigger value="day">Danas</TabsTrigger><TabsTrigger value="week">Ovaj tjedan</TabsTrigger><TabsTrigger value="all">Ukupno</TabsTrigger></TabsList>{['day','week','all'].map(p=><TabsContent value={p} key={p}><div className="ranking-head"><span>IGRAČ</span><span>BODOVI</span></div>{boardStatus==='loading'?<p className="board-message">Učitavamo rekorde…</p>:boardStatus==='error'?<div className="board-message">Ljestvica trenutno nije dostupna.<button onClick={()=>setRefresh(v=>v+1)} className="text-button">Pokušaj ponovno</button></div>:entries.length?<div className="ranking-scroll" role="region" aria-label="Najbolji rezultati — pomakni za više" tabIndex={0}>{entries.map((e,i)=><div className={'ranking-row '+(e.id===run.current?'your-result':'')} key={e.id}><span className={'rank rank-'+i}>{String(i+1).padStart(2,'0')}</span><span>{e.name}<small>{e.scoops} kuglica{e.id===run.current?' · tvoja runda':''}</small></span><strong>{fmt(e.score)}</strong></div>)}</div>:<div className="board-message empty-board"><Trophy size={26}/><strong>Prvi rekord čeka tebe.</strong><span>Odigraj rundu i objavi svoj rezultat.</span></div>}</TabsContent>)}</Tabs><div className="ranking-foot">Najbolji rezultat po nadimku · pomakni za više</div></section>
          <p className="device-note">Tvoj osobni rekord pamti se za ovaj preglednik. Na ljestvici se pojavljuješ tek kad objaviš nadimak.</p>
        </aside>
      </div><footer><span>© {new Date().getFullYear()} Magic Ice</span><span>Čarolija je u svakoj kuglici.</span><span>Strelice ili A / D · razmak za pauzu</span></footer>
    </main>
  </div>;
}
