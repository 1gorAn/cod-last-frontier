import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,nextSector,build,decode,encode,tick} from '../src/model.ts';
import {buildable,mapCells,terrainPath} from '../src/maps.ts';

test('all locations have connected terrain and legal starter buildings',()=>{
 const shapes=new Set<string>();
 for(let sector=1;sector<=16;sector++){
  const s=fresh(sector),cells=mapCells(sector);assert.ok(cells.length>=60);if(sector>1)assert.ok(cells.length<144);
  for(const b of s.buildings)assert.ok(buildable(sector,b.x,b.y));
  for(const p of cells)assert.ok(terrainPath(sector,{x:5,y:5},p).length);
  assert.ok(decode(encode(s)));if(sector<=6)shapes.add(JSON.stringify(cells));
 }
 assert.equal(shapes.size,6);
});
test('terrain rejects construction without spending money',()=>{
 const s=fresh(2),money=s.money;assert.equal(build(s,'power',1,1),false);assert.equal(s.money,money);
 assert.equal(build(s,'depot',5,6),true);
 const bad=fresh(2);bad.buildings[0].x=0;assert.equal(decode(encode(bad)),null);
});
test('next location unlocks only on victory and resets the operation',()=>{
 const s=fresh(3);assert.equal(nextSector(s),null);s.wave=10;s.phase='lost';assert.equal(nextSector(s),null);
 s.phase='won';s.money=99999;const next=nextSector(s)!;assert.equal(next.sector,4);assert.equal(next.wave,0);assert.equal(next.phase,'build');assert.equal(next.money,850);assert.equal(next.buildings.length,4);assert.equal(next.enemies.length,0);
 const legacy=fresh();delete legacy.sector;assert.equal(decode(encode(legacy))?.sector,1);
 for(const sector of [0,-1,1.5])assert.equal(decode(JSON.stringify({...s,sector})),null);
});
test('island delivery uses the bridge and returns to its depot',()=>{
 const s=fresh(4);s.money=10000;build(s,'depot',2,2);build(s,'defense',9,2);
 const gun=s.buildings.at(-1)!;gun.ammo=0;let delivered=false,sawBridge=false;
 for(let i=0;i<800;i++){
  tick(s,.05,()=>.5);
  for(const truck of s.trucks??[]){assert.ok(buildable(4,Math.round(truck.x),Math.round(truck.y)));if(truck.x>=5&&truck.x<=6)sawBridge=true;}
  if(gun.ammo===6)delivered=true;if(delivered&&!s.trucks?.length)break;
 }
 assert.ok(sawBridge);assert.ok(delivered);assert.equal(s.trucks?.length,0);
});
