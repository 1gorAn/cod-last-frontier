import {mapCells} from '../../src/maps.ts';
import {fresh,build,upgrade,repair,research,startWave,tick,resolveStarlink,maxHp,upgradeCost,type Kind,type Specialization} from '../../src/model.ts';

// A fixed, affordable plan: no injected resources, extra ammo or forced enemy deaths.
export function playOperation(seed:number,spread=false){
 const s=fresh();const point=(x:number,y:number)=>spread?{x:11-x,y:11-y}:{x,y};
 const slots=new Map<string,number>();
 const add=(kind:Kind,x:number,y:number)=>{const key=`${kind}:${x},${y}`;if(s.buildings.some(b=>b.id===slots.get(key)))return true;const aim=point(x,y),p=mapCells(s.sector).filter(p=>!s.buildings.some(b=>b.x===p.x&&b.y===p.y)).sort((a,b)=>Math.hypot(a.x-aim.x,a.y-aim.y)-Math.hypot(b.x-aim.x,b.y-aim.y))[0];if(!p||!build(s,kind,p.x,p.y))return false;slots.set(key,s.buildings.at(-1)!.id);return true;};
 add('depot',5,3);add('defense',7,6);add('radar',5,4);upgrade(s,s.buildings.find(b=>b.kind==='defense')!.id);
 for(let i=0;i<161;i++)tick(s,.05);
 startWave(s,'shield');let decision=0;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let step=0;step<24000&&s.phase==='attack';step++){
  if(s.starlink==='pending')resolveStarlink(s,true);
  if(step%20===0){
   for(const b of s.buildings)if(b.hp<maxHp(b)*.45&&s.money>150)repair(s,b.id);
   if(s.tech.security<3)research(s,'security');else if(s.tech.energy<2)research(s,'energy');else research(s,'automation');
   if(s.wave===2){add('power',6,6);const gun=s.buildings.find(b=>b.kind==='defense'&&b.level===1&&!b.upgradeLeft);if(gun)upgrade(s,gun.id,'rocket');}
   if(s.wave>=3&&!s.buildings.some(b=>b.kind==='orbital'))add('orbital',6,4);
   if(s.wave>=4&&s.buildings.some(b=>b.kind==='orbital')){
    const plan:[Kind,number,number][]=[['depot',7,5],['defense',7,3],['power',3,6],['cooler',6,7],['server',5,6],['defense',3,5],['repair',4,5]];
    if(decision<plan.length){if(add(...plan[decision]))decision++;}
    else{const candidate=s.buildings.find(b=>['defense','power','radar'].includes(b.kind)&&b.level<3&&!b.upgradeLeft&&s.money>=upgradeCost(b));if(candidate)upgrade(s,candidate.id,candidate.kind==='defense'&&!candidate.specialization?(candidate.id%2?'rocket':'flak') as Specialization:undefined);}
   }
  }
  tick(s,.05,random);
 }
 return {phase:s.phase,wave:s.wave,time:Math.round(s.elapsed),reason:s.defeatReason,money:Math.round(s.money)};
}
