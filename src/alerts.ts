import {buildingAlerts,metrics,type State} from './model';
let context:AudioContext|undefined,lastPlayed=0,previous=new Set<string>();
let enabled=false,volume=.2;
try{const settings=JSON.parse(localStorage.getItem('fortress-audio')??'{}');enabled=settings.enabled===true;if(Number.isFinite(settings.volume))volume=Math.max(0,Math.min(1,settings.volume));}catch{/* Optional preferences. */}
export function soundSettings(){return {enabled,volume};}
export function configureSound(on:boolean,level=volume){
 enabled=on;volume=Math.max(0,Math.min(1,level));
 try{localStorage.setItem('fortress-audio',JSON.stringify({enabled,volume}));}catch{/* Gameplay does not depend on local storage. */}
 if(enabled){try{context??=new AudioContext();void context.resume().catch(()=>{});}catch{enabled=false;}}
}
export function updateAlertSound(s:State){
 if(s.phase!=='attack'||document.hidden){previous.clear();return;}
 const m=metrics(s),active=new Set<string>();
 for(const b of s.buildings)for(const alert of buildingAlerts(s,b,m))if(['БК 0','ТОК','ЖАР'].includes(alert.code))active.add(`${b.id}:${alert.code}`);
 if(s.satellite&&!s.satellite.interceptor)active.add(`satellite:${s.wave}:${s.satellite.target}`);
 const isNew=[...active].some(key=>!previous.has(key));
 if(!isNew){previous=active;return;}
 if(!enabled||!context||context.state!=='running'||volume===0){previous=active;return;}
 // Coalesce alarms so several failing buildings do not produce a wall of sound.
 const now=context.currentTime;if(now-lastPlayed<4)return;previous=active;lastPlayed=now;
 const tone=context.createOscillator(),gain=context.createGain();tone.type='sine';tone.frequency.setValueAtTime(s.satellite?740:440,now);tone.frequency.setValueAtTime(s.satellite?540:330,now+.12);
 gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume*.25,now+.02);gain.gain.linearRampToValueAtTime(0,now+.3);
 tone.connect(gain);gain.connect(context.destination);tone.start(now);tone.stop(now+.32);tone.onended=()=>{tone.disconnect();gain.disconnect();};
}
