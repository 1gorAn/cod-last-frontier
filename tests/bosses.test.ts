import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,startWave,tick,decode,encode,defenseRange,defenseModifiers,nextSector,waveIntel,metrics,type Enemy} from '../src/model.ts';
import {bossType,bossInfo} from '../src/bosses.ts';
import {routeChoices,location,victoryReward} from '../src/maps.ts';

function arena(sector:number){const s=fresh(sector);s.wave=9;startWave(s,'shield');s.remaining=0;s.spawnIn=10000;s.satelliteRemaining=0;s.satelliteWave=10;const enemy:Enemy={id:s.nextId++,kind:'boss',bossType:bossType(sector),x:5,y:3,hp:1000,maxHp:2000,speed:0,damage:650,target:1,launchIn:100};s.enemies=[enemy];return {s,enemy,gun:s.buildings.find(b=>b.kind==='defense')!};}

test('each biome spawns its advertised boss with distinct profiles',()=>{
 for(let sector=1;sector<=6;sector++){const s=fresh(sector);s.wave=9;startWave(s,'shield');s.remaining=1;s.spawnIn=0;tick(s,.001,()=>.9);const boss=s.enemies.find(e=>e.kind==='boss')!;assert.ok(boss);assert.equal(boss.bossType,bossType(sector));assert.equal(boss.maxHp,bossInfo(sector).hp*2.5);assert.equal(waveIntel(s,10)?.boss?.name,bossInfo(sector).name);assert.ok(decode(encode(s)));}
 assert.equal(new Set([1,3,4,5,6].map(bossType)).size,5);
});
test('siege boss fires two interceptable rockets and preserves its ability timer',()=>{
 const {s,enemy,gun}=arena(3);gun.ammo=0;enemy.abilityIn=0;tick(s,.05,()=>.5);const missiles=s.enemies.filter(e=>e.kind==='missile');assert.equal(missiles.length,2);assert.ok(missiles.every(e=>e.summoned&&e.hp===30));assert.equal(enemy.abilityIn,6);assert.equal(decode(encode(s))!.enemies.find(e=>e.id===enemy.id)!.abilityIn,6);
});
test('siege armor reduces ordinary damage but rocket specialization bypasses it',()=>{
 for(const spec of [undefined,'rocket'] as const){const {s,enemy,gun}=arena(3);gun.specialization=spec;gun.level=2;tick(s,.05);const expected=46*1.35*(spec?2.2:.75);assert.ok(Math.abs(enemy.hp-(1000-expected))<.001);}
});
test('jammer affects only PVO within radius and its death restores range',()=>{
 const {s,enemy,gun}=arena(4);const base=(4.5+gun.level*.5);assert.equal(defenseRange(s,gun),base*.7);enemy.x=11;assert.equal(defenseRange(s,gun),base);enemy.x=5;enemy.hp=0;assert.equal(defenseRange(s,gun),base);
});
test('polar boss slows cooldown only while alive and in range',()=>{
 const {s,enemy,gun}=arena(5);gun.cooldown=2;tick(s,.1);assert.ok(Math.abs(gun.cooldown-1.935)<.0001);assert.equal(defenseModifiers(s,gun).reload,.65);enemy.hp=0;assert.equal(defenseModifiers(s,gun).reload,1);
});
test('regenerator heals at 12 HP per second without exceeding maximum or reviving',()=>{
 const {s,enemy,gun}=arena(6);gun.ammo=0;tick(s,1);assert.equal(enemy.hp,1012);enemy.hp=1999;tick(s,1);assert.equal(enemy.hp,2000);enemy.hp=0;tick(s,.05);assert.ok(!s.enemies.includes(enemy));
});
test('all bosses retain mini-drone deployment with a live-unit cap',()=>{
 for(const sector of [1,3,4,5,6]){const {s,enemy,gun}=arena(sector);gun.ammo=0;enemy.launchIn=0;tick(s,.05,()=>.5);assert.equal(s.enemies.filter(e=>e.mini).length,sector===1?3:2);assert.ok(s.enemies.filter(e=>e.mini).every(e=>e.summoned));}
});
test('two distinct destinations remain stable across saves and invalid choices are rejected',()=>{
 const s=fresh(4);assert.equal(nextSector(s,'delivery',5),null);s.wave=10;s.phase='won';const choices=routeChoices(s.sector);assert.equal(choices.length,2);assert.notEqual(location(choices[0]).name,location(choices[1]).name);assert.deepEqual(routeChoices(decode(encode(s))!.sector),choices);
 for(const destination of choices){const next=nextSector(s,'ammo',destination)!;assert.equal(next.sector,destination);assert.equal(next.entryReward,4);assert.equal(next.perk,'ammo');assert.ok(decode(encode(next)));}assert.equal(nextSector(s,'ammo',7),null);
});
test('victory rewards transfer once to the next base and do not accumulate on retry',()=>{
 for(const sector of [1,3,4,5,6]){const s=fresh(sector);s.phase='won';s.wave=10;s.money=99999;s.science=99;s.parts=999;const next=nextSector(s)!;const reward=victoryReward(sector);assert.equal(next.money,850+reward.money);assert.equal(next.parts,80+reward.parts);assert.equal(next.science,reward.science);
  const retry=fresh(next.sector,next.perk,next.entryReward);assert.equal(retry.money,next.money);assert.equal(retry.parts,next.parts);assert.equal(retry.science,next.science);assert.equal(metrics(retry).income,0);
 }
});
test('legacy bosses derive their biome behavior and invalid fields fail decoding',()=>{
 const {s,enemy,gun}=arena(4);delete enemy.bossType;assert.ok(decode(encode(s)));assert.equal(defenseModifiers(s,gun).range,.7);enemy.bossType='invalid' as never;assert.equal(decode(encode(s)),null);enemy.bossType='jammer';enemy.abilityIn=-1;assert.equal(decode(encode(s)),null);delete enemy.abilityIn;s.entryReward=s.sector;assert.equal(decode(encode(s)),null);
});
