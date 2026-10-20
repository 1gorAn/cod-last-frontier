import test from 'node:test';
import assert from 'node:assert/strict';
import {session,step,togglePause} from '../src/session.ts';
import {fresh,startWave,encode,upgrade,tick} from '../src/model.ts';
import {playOperation} from './helpers/play-operation.ts';

test('combat pause freezes the whole simulation at double speed and resumes it',()=>{
 session.state=fresh();session.paused=false;session.modalOpen=false;session.speed=2;
 startWave(session.state,'shield');upgrade(session.state,session.state.buildings[0].id);
 step(.05);togglePause();const frozen=encode(session.state);
 for(let i=0;i<80;i++)step(.05);
 assert.equal(encode(session.state),frozen);assert.equal(session.paused,true);
 togglePause();step(.05);assert.notEqual(encode(session.state),frozen);
 session.speed=1;
});
test('service dialogs stop combat and preserve a manual pause',()=>{
 session.state=fresh();startWave(session.state,'shield');session.paused=false;session.modalOpen=true;
 const frozen=encode(session.state);step(.1);assert.equal(encode(session.state),frozen);
 session.modalOpen=false;step(.1);assert.notEqual(encode(session.state),frozen);
 togglePause();session.modalOpen=true;step(.1);session.modalOpen=false;
 const paused=encode(session.state);step(.1);assert.equal(encode(session.state),paused);
 session.state.phase='won';togglePause();assert.equal(session.paused,true);session.paused=false;
});
test('preparation allows infrastructure upgrades without damaging servers or reputation',()=>{
 const s=fresh();s.buildings=s.buildings.filter(b=>b.kind!=='power');
 const hp=s.buildings[0].hp;for(let i=0;i<600;i++)tick(s,.05);
 assert.equal(s.buildings[0].hp,hp);assert.equal(s.reputation,100);assert.equal(s.money,850);
 startWave(s,'shield');tick(s,1);assert.ok(s.buildings[0].hp<hp);assert.ok(s.reputation<100);
});
test('first location gives more time between enemy groups without changing later locations',()=>{
 const first=fresh(),later=fresh(2);
 for(const s of [first,later]){startWave(s,'shield');tick(s,1,()=>.5);}
 assert.ok(Math.abs(first.spawnIn-later.spawnIn*1.2)<.001);
 assert.equal(first.enemies[0].maxHp,later.enemies[0].maxHp);
});
test('an affordable strategy completes all ten waves with compact and spread defenses',()=>{
 for(const spread of [false,true])for(const seed of [1,7,17,30]){
  const result=playOperation(seed,spread);assert.equal(result.phase,'won',JSON.stringify({seed,spread,...result}));assert.equal(result.wave,10);
 }
});
