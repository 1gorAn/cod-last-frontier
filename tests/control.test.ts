import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,build,tick,startWave,requestResupply,ammoCapacity,waveIntel,buildingAlerts,supplyRoute,decode,encode} from '../src/model.ts';
import {buildable} from '../src/maps.ts';

test('manual partial refill waits for a depot and survives saves',()=>{
 const s=fresh(),gun=s.buildings.find(b=>b.kind==='defense')!;gun.ammo=2;const money=s.money;assert.ok(requestResupply(s,gun.id));assert.equal(gun.ammo,2);assert.equal(s.money,money);assert.equal(requestResupply(s,gun.id),false);
 tick(s,.05);assert.equal(s.trucks?.length,0);const loaded=decode(encode(s))!;const lg=loaded.buildings.find(b=>b.id===gun.id)!;assert.ok(lg.resupplyRequested);build(loaded,'depot',4,4);for(let i=0;i<50;i++)tick(loaded,.05);assert.equal(lg.ammo,ammoCapacity(loaded));assert.equal(lg.resupplyRequested,undefined);
});
test('manual requests reject full magazines, other buildings, and finished operations',()=>{
 const s=fresh(),gun=s.buildings.find(b=>b.kind==='defense')!;assert.equal(requestResupply(s,gun.id),false);assert.equal(requestResupply(s,1),false);gun.ammo=1;s.phase='won';assert.equal(requestResupply(s,gun.id),false);
});
test('empty PVO take priority over a nearer partial refill and no truck duplicates a stop',()=>{
 const s=fresh();s.money=10000;build(s,'depot',4,4);build(s,'depot',6,4);build(s,'defense',9,9);build(s,'defense',10,9);
 const guns=s.buildings.filter(b=>b.kind==='defense');guns[0].ammo=2;requestResupply(s,guns[0].id);guns[1].ammo=0;guns[2].ammo=0;tick(s,.05);
 assert.deepEqual(s.trucks![0].stops.sort((a,b)=>a-b),[guns[1].id,guns[2].id]);const stops=s.trucks!.flatMap(t=>t.stops);assert.equal(new Set(stops).size,stops.length);assert.equal(requestResupply(s,guns[1].id),false);
});
test('request is recovered after the supplying depot is destroyed',()=>{
 const s=fresh();build(s,'depot',4,4);const gun=s.buildings.find(b=>b.kind==='defense')!;gun.ammo=2;requestResupply(s,gun.id);tick(s,.05);s.buildings=s.buildings.filter(b=>b.kind!=='depot');tick(s,.05);assert.equal(s.trucks!.length,0);assert.ok(gun.resupplyRequested);build(s,'depot',4,4);for(let i=0;i<40;i++)tick(s,.05);assert.equal(gun.ammo,6);
});
test('intelligence matches actual ordinary spawns and dominant direction',()=>{
 for(const wave of [1,2,3,6,10]){const s=fresh();s.wave=wave-1;startWave(s,'shield');s.starlink='kept';s.rareSpawned=true;const intel=waveIntel(s,wave)!;
  while(s.remaining>0){s.spawnIn=0;tick(s,.001,()=>.99);}
  for(const kind of ['drone','missile','heavy','boss','pig'] as const)assert.equal(s.enemies.filter(e=>e.kind===kind).length,intel.counts[kind]);
  const main=s.enemies.filter(e=>intel.edge===0?e.x<=0:intel.edge===1?e.x>=11:intel.edge===2?e.y<=0:e.y>=11);assert.ok(main.length>=intel.total*.6);
  assert.deepEqual(waveIntel(decode(encode(s))!,wave),intel);
 }
 assert.equal(waveIntel(fresh(),11),null);
});
test('alerts identify empty ammo, power loss, overheating and suppress inactive upgrade warnings',()=>{
 const s=fresh();s.buildings=s.buildings.filter(b=>b.kind!=='power');const gun=s.buildings.find(b=>b.kind==='defense')!;gun.ammo=0;assert.deepEqual(buildingAlerts(s,gun).map(a=>a.code),['БК 0','ТОК']);assert.ok(buildingAlerts(s,s.buildings[0]).some(a=>a.code==='ЖАР'));gun.upgradeLeft=4;assert.deepEqual(buildingAlerts(s,gun).map(a=>a.code),['↑']);
});
test('route display follows passable island terrain and includes return to depot',()=>{
 const s=fresh(4);s.money=10000;build(s,'depot',2,2);build(s,'defense',9,2);const gun=s.buildings.at(-1)!;gun.ammo=2;requestResupply(s,gun.id);tick(s,.05);tick(s,.05);
 const truck=s.trucks![0],route=supplyRoute(s,truck);assert.ok(route.some(p=>p.x===gun.x&&p.y===gun.y));assert.deepEqual(route.at(-1),{x:2,y:2});for(const p of route)assert.ok(buildable(s.sector,Math.round(p.x),Math.round(p.y)));
});

test('truck returns immediately when targets vanish before it leaves the depot',()=>{
 const s=fresh(2);build(s,'depot',4,4);const gun=s.buildings.find(b=>b.kind==='defense')!;gun.ammo=0;tick(s,.05);assert.equal(s.trucks!.length,1);s.buildings=s.buildings.filter(b=>b.id!==gun.id);tick(s,.05);assert.equal(s.trucks!.length,0);
});
