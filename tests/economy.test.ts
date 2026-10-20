import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,build,upgrade,startWave,tick,resolveStarlink,metrics,waveIncomeLimit,encode,decode} from '../src/model.ts';

function earningBase(){const s=fresh();startWave(s,'shield');s.spawnIn=10000;return s;}

test('server income slows investment payback and scales with diminishing returns',()=>{
 const s=earningBase();assert.equal(metrics(s).income,5);s.money=10000;
 build(s,'power',0,0);build(s,'cooler',0,1);build(s,'server',1,0);
 const two=metrics(s).income;assert.ok(two>5&&two<10);
 build(s,'server',1,1);const three=metrics(s).income;assert.ok(three>two);assert.ok(three-two<two-5);
});

test('orders cannot be farmed indefinitely, exceeded by a large timestep, or reset by saving',()=>{
 const s=earningBase();s.waveEarnings=waveIncomeLimit(s.wave)-.1;const money=s.money;
 tick(s,1);assert.ok(Math.abs(s.money-money-.1)<1e-9);assert.equal(s.waveEarnings,waveIncomeLimit(s.wave));assert.equal(metrics(s).income,0);
 const loaded=decode(encode(s))!;assert.ok(loaded);const balance=loaded.money;
 tick(loaded,30);assert.equal(loaded.money,balance);assert.equal(metrics(loaded).income,0);
 loaded.remaining=0;tick(loaded,.05);assert.equal(loaded.wave,2);assert.equal(loaded.waveEarnings,0);assert.ok(metrics(loaded).income>0);
});

test('budget protocol shown income matches the actual discounted payment',()=>{
 const s=fresh();startWave(s,'budget');s.spawnIn=10000;const money=s.money,rate=metrics(s).income;
 assert.equal(rate,3.75);tick(s,.5);assert.equal(s.money-money,rate*.5);
});

test('compute research speeds payment by 15 percent per level without bypassing the order limit',()=>{
 const s=earningBase();const base=metrics(s).income;s.tech.compute=3;
 assert.equal(metrics(s).income,base*1.45);assert.equal(metrics(s).incomeLimit,waveIncomeLimit(1));
 s.waveEarnings=waveIncomeLimit(1);assert.equal(metrics(s).income,0);
});

test('summoned enemies give no bounty while ordinary targets still reward defense',()=>{
 for(const summoned of [true,false]){const s=earningBase();s.waveEarnings=waveIncomeLimit(1);const money=s.money;
  s.enemies.push({id:s.nextId++,kind:'drone',summoned,x:0,y:0,hp:0,maxHp:36,speed:0,damage:0,target:s.buildings[0].id});
  tick(s,.05);assert.equal(s.kills,1);assert.equal(s.money-money,summoned?0:4);
 }
});

test('legacy saves load with fresh orders and corrupt payment totals are rejected',()=>{
 const s=earningBase();delete s.waveEarnings;const loaded=decode(encode(s))!;assert.ok(loaded);assert.equal(metrics(loaded).incomeRemaining,waveIncomeLimit(1));
 for(const invalid of [-1,waveIncomeLimit(1)+1,Infinity]){s.waveEarnings=invalid;assert.equal(decode(encode(s)),null);}
});

test('ordinary starting budget can fund orbital defense before the first satellite',()=>{
 for(const initialSeed of [7,77,123,314]){
  const s=fresh();build(s,'depot',5,3);build(s,'defense',7,6);build(s,'radar',5,4);upgrade(s,s.buildings.find(b=>b.kind==='defense')!.id);
  for(let i=0;i<161;i++)tick(s,.05);
  let seed=initialSeed;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  let upgraded=false,builtAt:number|undefined;startWave(s,'shield');
  for(let i=0;i<4000&&s.phase==='attack'&&!s.satellite;i++){
   if(s.starlink==='pending')resolveStarlink(s,true);
   if(s.wave>=2&&!upgraded){upgrade(s,s.buildings.find(b=>b.kind==='power')!.id);upgrade(s,s.buildings.find(b=>b.kind==='defense'&&b.level===1)!.id);upgraded=true;}
   if(builtAt===undefined&&s.wave>=3&&s.money>=1000&&build(s,'orbital',6,4))builtAt=s.elapsed;
   tick(s,.05,random);
  }
  assert.ok(s.satellite,`seed ${initialSeed} must reach the first satellite`);
  assert.ok(builtAt!==undefined&&builtAt<s.elapsed,`seed ${initialSeed} must afford orbital defense before impact`);
 }
});
