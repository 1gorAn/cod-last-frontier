import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,build,upgrade,tick,startWave,metrics,upgradeForecast,setPriority,emergencyIntercept,ammoCapacity,repair,repairPrice,nextSector,encode,decode} from '../src/model.ts';

function combat(){const s=fresh();startWave(s,'shield');s.spawnIn=10000;s.remaining=1;return s;}
function enemy(s:ReturnType<typeof fresh>,kind:'drone'|'heavy'|'missile',x:number,y:number){return {id:s.nextId++,kind,x,y,hp:1000,maxHp:1000,speed:0,damage:10,target:s.buildings[0].id};}

test('specialization activates only when the upgrade completes and survives saving',()=>{
 const s=fresh(),gun=s.buildings.find(b=>b.kind==='defense')!;assert.ok(upgrade(s,gun.id,'flak'));assert.equal(gun.specialization,undefined);
 const loaded=decode(encode(s))!;assert.equal(loaded.buildings.find(b=>b.id===gun.id)!.pendingSpecialization,'flak');tick(loaded,8);
 const upgraded=loaded.buildings.find(b=>b.id===gun.id)!;assert.equal(upgraded.specialization,'flak');assert.equal(upgraded.pendingSpecialization,undefined);loaded.money=10000;assert.equal(upgrade(loaded,gun.id,'rocket'),false);
});
test('missile priority takes precedence over distance and heavy priority selects heavy targets',()=>{
 for(const priority of ['missile','heavy'] as const){const s=combat(),gun=s.buildings.find(b=>b.kind==='defense')!;s.enemies=[enemy(s,'drone',gun.x+.2,gun.y),enemy(s,priority,gun.x+2,gun.y)];assert.ok(setPriority(s,gun.id,priority));tick(s,.05);assert.equal(s.enemies[0].hp,1000);assert.ok(s.enemies[1].hp<1000);}
});
test('flak deals splash damage and rockets trade fire rate for heavy-target damage',()=>{
 const s=combat(),gun=s.buildings.find(b=>b.kind==='defense')!;gun.level=2;gun.specialization='flak';s.enemies=[enemy(s,'drone',4,4),enemy(s,'drone',4.5,4)];tick(s,.05);assert.ok(s.enemies.every(e=>e.hp<1000));
 const r=combat(),rocket=r.buildings.find(b=>b.kind==='defense')!;rocket.level=2;rocket.specialization='rocket';r.enemies=[enemy(r,'heavy',4,4)];tick(r,.05);assert.ok(Math.abs(r.enemies[0].hp-(1000-46*1.35*2.2))<.001);assert.equal(rocket.cooldown,1.5);
});
test('emergency interception costs money, works without power, and is limited to one per wave',()=>{
 const s=combat();s.wave=4;s.satelliteWave=4;s.satelliteRemaining=0;s.buildings=s.buildings.filter(b=>b.kind!=='power');s.satellite={target:s.buildings[0].id,x:5,y:5,progress:0};
 const money=s.money;assert.ok(emergencyIntercept(s));assert.equal(s.money,money-300);assert.equal(emergencyIntercept(s),false);assert.ok(decode(encode(s)));for(let i=0;i<21;i++)tick(s,.05);assert.equal(s.satellite,undefined);assert.ok(s.buildings.some(b=>b.kind==='server'));
 s.satellite={target:s.buildings[0].id,x:5,y:5,progress:0};assert.equal(emergencyIntercept(s),false);s.wave=5;assert.equal(emergencyIntercept(s),true);
});
test('emergency cannot be purchased without money or an active falling satellite',()=>{
 const s=combat();assert.equal(emergencyIntercept(s),false);s.satellite={target:1,x:5,y:5,progress:0};s.money=299;assert.equal(emergencyIntercept(s),false);assert.equal(s.money,299);
});
test('satellites wait for all airborne wave spawns and final phase finishes in under 40 seconds',()=>{
 const s=combat();s.wave=10;s.satelliteWave=10;s.satelliteRemaining=10;s.satelliteAt=0;s.money=1000;build(s,'orbital',5,6);
 tick(s,.05);assert.equal(s.satellite,undefined);s.remaining=0;const start=s.elapsed;
 for(let i=0;i<800&&s.phase==='attack';i++)tick(s,.05,()=>.5);
 assert.equal(s.phase,'won');assert.ok(s.elapsed-start<40);
});
test('barrel plane is guaranteed at the start of wave nine unless already encountered',()=>{
 for(const appeared of [false,true]){const s=fresh();s.wave=8;s.rareSpawned=appeared;startWave(s,'shield');s.spawnIn=0;tick(s,.05,()=>.99);assert.equal(s.enemies.some(e=>e.kind==='barrel'),!appeared);}
});
test('location conditions and selectable perks change the advertised resources',()=>{
 assert.equal(metrics(fresh(5)).cooling,65);assert.equal(metrics(fresh(3)).power,65*1.15);
 const s=fresh();s.phase='won';s.wave=10;const next=nextSector(s,'ammo')!;assert.equal(next.perk,'ammo');assert.equal(ammoCapacity(next),8);assert.equal(next.buildings.find(b=>b.kind==='defense')!.ammo,8);assert.ok(decode(encode(next)));
 const repairBase=fresh(1,'repair');assert.equal(repairPrice(repairBase),.7);repairBase.buildings[0].hp-=50;const money=repairBase.money;repair(repairBase,1);assert.ok(Math.abs(money-repairBase.money-7)<.001);
 startWave(repairBase,'shield');assert.equal(metrics(repairBase).income,4.5);
});
test('upgrade forecast warns without mutating state',()=>{
 const s=fresh(),before=encode(s);const warning=upgradeForecast(s,s.buildings.find(b=>b.kind==='power')!.id);assert.match(warning,/ПВО остановится/);assert.match(warning,/охлаждения/);assert.equal(encode(s),before);
});
test('defeat explains the lethal attack and empty nearby PVO',()=>{
 const s=combat();s.buildings[0].hp=1;const gun=s.buildings.find(b=>b.kind==='defense')!;gun.ammo=0;
 s.enemies=[enemy(s,'missile',5,5)];tick(s,.05);assert.equal(s.phase,'lost');assert.match(s.defeatReason!,/попадание ракеты/);assert.match(s.defeatReason!,/без боеприпасов/);assert.equal(decode(encode(s))?.defeatReason,s.defeatReason);
});
test('invalid new save fields are rejected and legacy saves load',()=>{
 const s=fresh();assert.ok(decode(encode(s)));for(const changes of [{perk:'invalid'},{emergencyWave:11},{defeatReason:15}])assert.equal(decode(JSON.stringify({...s,...changes})),null);
 s.buildings.find(b=>b.kind==='defense')!.priority='invalid' as never;assert.equal(decode(encode(s)),null);
});

test('delivery perks change vehicle travel time and ammo perk refills eight rounds',()=>{
 const timings:number[]=[];
 for(const perk of [undefined,'delivery','ammo'] as const){const s=fresh(1,perk);assert.ok(build(s,'depot',4,6)===false);assert.ok(build(s,'depot',4,5));const gun=s.buildings.find(b=>b.kind==='defense')!;gun.ammo=0;
  let steps=0;while(gun.ammo===0&&steps<200){tick(s,.05);steps++;}assert.equal(gun.ammo,ammoCapacity(s));timings.push(steps);
 }
 assert.ok(timings[1]<timings[0]);assert.ok(timings[2]>timings[0]);
});
test('second wave warns about the coming satellite requirement',()=>{
 const s=fresh();s.wave=1;startWave(s,'shield');assert.match(s.event,/1000 ₽/);assert.match(s.event,/300 ₽/);
});
test('satellite loss report identifies orbital protection and preserves the report',()=>{
 const s=combat();s.wave=4;s.satelliteWave=4;s.satelliteRemaining=0;s.satellite={target:1,x:5,y:5,progress:4.49};tick(s,.05);
 assert.equal(s.phase,'lost');assert.match(s.defeatReason!,/попадание спутника/);assert.match(s.defeatReason!,/орбитальная ПВО/);assert.equal(decode(encode(s))?.defeatReason,s.defeatReason);
});
