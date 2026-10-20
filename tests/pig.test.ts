import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,startWave,tick,build,waveIntel,decode,encode,setPriority,type Enemy} from '../src/model.ts';
import {buildable} from '../src/maps.ts';

function arena(sector=1){const s=fresh(sector);s.wave=4;startWave(s,'shield');s.spawnIn=10000;s.remaining=1;s.satelliteRemaining=0;s.satelliteWave=5;s.buildings.find(b=>b.kind==='defense')!.ammo=0;return s;}
function pig(s:ReturnType<typeof fresh>,x:number,y:number,target=1):Enemy{return {id:s.nextId++,kind:'pig',x,y,hp:1000,maxHp:1000,speed:.55,damage:40,target};}

test('pig counts agree with reconnaissance and appear only from wave five',()=>{
 for(const wave of [1,4,5,7,8,9,10]){const s=fresh();s.wave=wave-1;startWave(s,'shield');s.rareSpawned=true;while(s.remaining>0){s.spawnIn=0;tick(s,.001,()=>.99);}const expected=wave<5?0:wave<8?1:2;assert.equal(s.enemies.filter(e=>e.kind==='pig').length,expected);assert.equal(waveIntel(s,wave)!.counts.pig,expected);assert.equal(s.enemies.length,10+wave*5);}
});
test('pig enters every location on accessible unoccupied terrain',()=>{
 for(let sector=1;sector<=6;sector++){const s=arena(sector);s.remaining=31;s.spawnIn=0;tick(s,.001,()=>.5);const e=s.enemies.find(e=>e.kind==='pig')!;assert.ok(e);assert.ok(buildable(sector,e.x,e.y));assert.ok(!s.buildings.some(b=>b.x===e.x&&b.y===e.y));assert.ok(decode(encode(s)));}
});
test('walking pig uses the island bridge and launches an interceptable missile',()=>{
 const s=arena(4);s.money=10000;build(s,'power',9,2);const target=s.buildings.at(-1)!;const e=pig(s,2,2,target.id);s.enemies=[e];let usedBridge=false;
 for(let i=0;i<1200&&!s.enemies.some(e=>e.kind==='missile');i++){tick(s,.05,()=>.5);assert.ok(buildable(4,Math.round(e.x),Math.round(e.y)));if(e.x>4&&e.x<7){assert.ok(e.y>=4&&e.y<=6);usedBridge=true;}}
 assert.ok(usedBridge);const rocket=s.enemies.find(e=>e.kind==='missile')!;assert.ok(rocket);assert.equal(rocket.summoned,true);assert.equal(rocket.target,target.id);assert.equal(rocket.hp,24);assert.ok(e.pigAttackLeft!>0);assert.ok(decode(encode(s)));
});
test('pig stops to shoot instead of disappearing in a collision',()=>{
 const s=arena(),e=pig(s,5,4);e.launchIn=0;s.enemies=[e];tick(s,.05);assert.ok(s.enemies.includes(e));assert.equal(e.x,5);assert.equal(e.y,4);assert.equal(s.enemies.filter(a=>a.kind==='missile').length,1);tick(s,.05);assert.equal(s.enemies.filter(a=>a.kind==='missile').length,1);assert.ok(e.launchIn!>3);
});
test('heavy targeting includes pigs, applies rocket specialization and triggers hurt animation',()=>{
 const s=arena(),gun=s.buildings.find(b=>b.kind==='defense')!;gun.ammo=6;gun.level=2;gun.specialization='rocket';setPriority(s,gun.id,'heavy');const e=pig(s,5,3);const drone:Enemy={...pig(s,4,3.5),kind:'drone'};s.enemies=[drone,e];tick(s,.05);assert.equal(drone.hp,1000);assert.ok(Math.abs(e.hp-(1000-46*1.35*2.2))<.001);assert.ok(e.pigHitLeft!>0);
});
test('pig retargets destroyed buildings and never fires after death',()=>{
 const s=arena(),e=pig(s,5,4,999);e.launchIn=0;s.enemies=[e];tick(s,.05);assert.ok(s.buildings.some(b=>b.id===e.target));s.enemies=[e];e.hp=0;tick(s,.05);assert.equal(s.enemies.length,0);assert.equal(s.kills,1);
});
test('pig timers survive saves and corrupt ground positions or timers are rejected',()=>{
 const s=arena(4),e=pig(s,4,4);e.pigAttackLeft=.5;e.pigHitLeft=.2;e.pigSpawnLeft=.3;e.launchIn=2;s.enemies=[e];const loaded=decode(encode(s))!;assert.ok(loaded);assert.deepEqual(loaded.enemies,s.enemies);e.x=5;e.y=2;assert.equal(decode(encode(s)),null);e.x=4;e.y=4;e.pigHitLeft=9;assert.equal(decode(encode(s)),null);
});
