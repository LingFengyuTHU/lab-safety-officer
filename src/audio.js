/* Original chiptune: 微光值夜 / Night Shift (4/4, 112 BPM, C major).
 * Composed for this project: pulse melody, triangle bass, soft square arpeggio.
 * No samples or external music. Scheduling is independent of rendering frame rate. */
window.LabAudio=(()=>{
 let ctx=null,musicBus=null,sfxBus=null,timer=null,next=0,step=0,enabled=true,fx=true,volume=.45,active=false,lastFx=0;
 const activeNodes=new Set(),bpm=112,eighth=60/bpm/2;
 const melody=[
 [72,76,79,76,74,76,72,0],[69,72,76,79,76,72,71,0],
 [65,69,72,76,74,72,69,0],[67,71,74,79,77,74,71,0],
 [72,0,76,79,81,79,76,74],[69,72,76,0,79,76,74,72],
 [65,69,72,74,76,74,72,69],[67,71,74,71,72,0,0,0],
 [79,76,72,76,81,79,76,0],[76,72,69,72,79,76,72,0],
 [77,76,74,72,69,72,74,76],[74,71,67,71,74,77,79,0],
 [76,79,84,79,81,79,76,72],[72,76,81,79,76,74,72,69],
 [69,72,77,76,74,72,71,69],[67,71,74,79,72,0,72,0]
 ];
 const chords=[[48,52,55],[45,48,52],[41,45,48],[43,47,50]];
 function ensure(){if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();musicBus=ctx.createGain();sfxBus=ctx.createGain();musicBus.gain.value=volume;musicBus.connect(ctx.destination);sfxBus.gain.value=.6;sfxBus.connect(ctx.destination);}if(ctx.state==='suspended')ctx.resume().catch(()=>{});}
 function tone(note,time,duration,type,level,bus){if(!note)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=440*Math.pow(2,(note-69)/12);o.connect(g);g.connect(bus);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(level,time+.008);g.gain.setValueAtTime(level*.7,time+duration*.65);g.gain.linearRampToValueAtTime(0,time+duration);o.start(time);o.stop(time+duration+.01);activeNodes.add(o);o.onended=()=>{activeNodes.delete(o);o.disconnect();g.disconnect();};}
 function schedule(){if(!active||!enabled||!ctx)return;while(next<ctx.currentTime+.16){const bar=Math.floor(step/8)%16,beat=step%8,chord=chords[bar%4];tone(melody[bar][beat],next,eighth*.82,'square',.045,musicBus);tone(chord[beat%3]+12,next,eighth*.55,'square',.012,musicBus);if(beat%2===0)tone(chord[beat%4===0?0:2]-12,next,eighth*1.65,'triangle',.10,musicBus);if(beat%2===1)tone(96,next,.025,'triangle',.009,musicBus);step=(step+1)%128;next+=eighth;}}
 function stop(){clearInterval(timer);timer=null;for(const o of activeNodes){try{o.stop();}catch{}}activeNodes.clear();}
 function sync(){if(!ctx)return;musicBus.gain.setTargetAtTime(enabled&&active?volume:0,ctx.currentTime,.04);if(enabled&&active&&!timer){next=ctx.currentTime+.04;timer=setInterval(schedule,75);schedule();}else if((!enabled||!active)&&timer)stop();}
 function unlock(){try{ensure();sync();}catch{}}
 function config(options){enabled=options.music;fx=options.sfx;volume=options.volume;sync();}
 function setActive(value){active=value;sync();}
 function sfx(type){if(!fx)return;try{ensure();const now=ctx.currentTime;if(now-lastFx<.045)return;lastFx=now;const notes={shot:[69,.025,.035],spray:[43,.05,.03],pickup:[88,.06,.05],hurt:[36,.15,.08],kill:[47,.045,.025],heal:[81,.15,.05],good:[84,.2,.06],bad:[40,.15,.05]};const c=notes[type];if(c)tone(c[0],now,c[1],type==='pickup'?'triangle':'square',c[2],sfxBus);}catch{}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();}else sync();});
 return {unlock,config,setActive,sfx,score:{title:'微光值夜',bpm,melody,chords,eighth}};
})();
