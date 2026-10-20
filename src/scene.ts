import {habitat,terrainNoise} from './environment';
import {BOSSES,bossType} from './bosses';
import {buildable,location} from './maps';
import {PIG_COLUMNS,PIG_PIVOTS,PIG_ROWS,SERVER_FRAMES,ORBITAL_FRAME,ORBITAL_ROCKET_FRAME} from './art';
import Phaser from 'phaser';
import {SATELLITE_FLIGHT,AMMO_CAPACITY,ammoCapacity,UPGRADE_SECONDS,operational,defenseRange,buildingAlerts,supplyRoute,waveIntel,SIZE,TYPES,build,maxHp,metrics,occupied,type Building,type State} from './model';
import {session,step,save,notify,togglePause} from './session';
const TW=38, TH=19;
const iso=(x:number,y:number)=>({x:(x-y)*TW,y:(x+y)*TH});
export class World extends Phaser.Scene {
 g!:Phaser.GameObjects.Graphics; terrain!:Phaser.GameObjects.Graphics; hover:{x:number;y:number}|null=null; down={x:0,y:0,sx:0,sy:0}; dragged=false; pinch=0; userZoom=1;
 buildingViews=new Map<number,{base:Phaser.GameObjects.Graphics;overlay:Phaser.GameObjects.Graphics;sprite?:Phaser.GameObjects.Image;alerts?:Phaser.GameObjects.Text}>();
 nature!:Phaser.GameObjects.Graphics;
 waterDetails:{x:number;y:number}[]=[];wildlife:{x:number;y:number;water:boolean}[]=[];
 terrainSector=0;
 intelLabel?:Phaser.GameObjects.Text;
 orbitalRocket?:Phaser.GameObjects.Image;
 pigState?:State;
 pigViews=new Map<number,{sprite:Phaser.GameObjects.Image;lastX:number;lastY:number;deathAt?:number}>();
 rareSprites=new Map<number,Phaser.GameObjects.Image>();
 constructor(){super('world');}
 preload(){this.load.image('mecha-pig','./assets/mecha-pig.png');this.load.image('barrel-pilot','./assets/barrel-pilot.png');this.load.image('server-levels','./assets/server-levels.png');this.load.image('orbital','./assets/orbital-interceptor.png');}
 create(){
  for(const [row,[top,bottom]] of Object.entries(PIG_ROWS))for(let col=0;col<8;col++)this.textures.get('mecha-pig').add(`${row}-${col}`,0,PIG_COLUMNS[col],top,PIG_COLUMNS[col+1]-PIG_COLUMNS[col],bottom-top);
  SERVER_FRAMES.forEach((r,i)=>this.textures.get('server-levels').add(`level-${i+1}`,0,r[0],r[1],r[2],r[3]));
  this.textures.get('orbital').add('building',0,...ORBITAL_FRAME);this.textures.get('orbital').add('rocket',0,...ORBITAL_ROCKET_FRAME);
  this.cameras.main.setBackgroundColor('#233f3c');this.terrain=this.add.graphics().setDepth(-100);this.g=this.add.graphics().setDepth(1000);this.nature=this.add.graphics().setDepth(-90);this.drawTerrain();this.fit();
  this.scale.on('resize',()=>this.fit());this.input.addPointer(1);
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{this.down={x:p.x,y:p.y,sx:this.cameras.main.scrollX,sy:this.cameras.main.scrollY};this.dragged=false;});
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
   const a=this.input.pointer1,b=this.input.pointer2;if(a.isDown&&b.isDown){const dist=Phaser.Math.Distance.Between(a.x,a.y,b.x,b.y);if(this.pinch)this.zoom(dist/this.pinch);this.pinch=dist;this.dragged=true;return;}
   if(p.isDown&&Math.hypot(p.x-this.down.x,p.y-this.down.y)>7){this.dragged=true;this.cameras.main.scrollX=this.down.sx-(p.x-this.down.x)/this.cameras.main.zoom;this.cameras.main.scrollY=this.down.sy-(p.y-this.down.y)/this.cameras.main.zoom;}
   const world=this.cameras.main.getWorldPoint(p.x,p.y);this.hover={x:Math.floor((world.x/TW+world.y/TH)/2),y:Math.floor((world.y/TH-world.x/TW)/2)};
  });
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{if(this.pinch){this.pinch=0;return;}if(this.dragged)return;const v=this.cameras.main.getWorldPoint(p.x,p.y);const x=Math.floor((v.x/TW+v.y/TH)/2),y=Math.floor((v.y/TH-v.x/TW)/2);if(session.placing){if(build(session.state,session.placing,x,y)){session.selected=occupied(session.state,x,y)!.id;session.placing=null;save();notify('Здание построено');}else notify('Нужна доступная свободная клетка и достаточный бюджет');}else{const truck=session.state.trucks?.find(t=>{const p=iso(t.x+.5,t.y+.5);return Math.hypot(p.x-v.x,p.y-6-v.y)<18;});session.selected=truck?.depot??occupied(session.state,x,y)?.id??0;}});
  this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>this.zoom(dy>0?.9:1.1));
  this.input.keyboard?.on('keydown-ESC',()=>{session.placing=null;session.selected=0;});
  this.input.keyboard?.on('keydown-SPACE',(e:KeyboardEvent)=>{if(e.repeat||session.modalOpen||['BUTTON','INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName)||(e.target as HTMLElement)?.isContentEditable)return;e.preventDefault();togglePause();});
 }
 fit(){const cam=this.cameras.main;cam.setZoom(Math.min(this.scale.width/1050,this.scale.height/700)*this.userZoom);cam.centerOn(0,210);}
 zoom(f:number){this.userZoom=Phaser.Math.Clamp(this.userZoom*f,.65,2.8);const cam=this.cameras.main;cam.setZoom(Math.min(this.scale.width/1050,this.scale.height/700)*this.userZoom);}
 poly(g:Phaser.GameObjects.Graphics,points:number[],color:number,alpha=1){g.fillStyle(color,alpha);g.fillPoints(Array.from({length:points.length/2},(_,i)=>new Phaser.Geom.Point(points[i*2],points[i*2+1])),true);}
 tile(g:Phaser.GameObjects.Graphics,x:number,y:number,color:number,alpha=1){const p=iso(x,y);this.poly(g,[p.x,p.y,p.x+TW,p.y+TH,p.x,p.y+TH*2,p.x-TW,p.y+TH],color,alpha);}
 box(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,d:number,h:number,top:number,left:number,right:number){this.poly(g,[x,y-h,x+w,y+d-h,x,y+d*2-h,x-w,y+d-h],top);this.poly(g,[x-w,y+d-h,x,y+2*d-h,x,y+2*d,x-w,y+d],left);this.poly(g,[x,y+2*d-h,x+w,y+d-h,x+w,y+d,x,y+2*d],right);g.lineStyle(1,0xffffff,.13);g.lineBetween(x-w,y+d-h,x,y+2*d-h);g.lineBetween(x,y+2*d-h,x+w,y+d-h);}
 drawTerrain(){const sector=session.state.sector??1;this.terrainSector=sector;this.drawLocation(sector);}
 drawTree(g:Phaser.GameObjects.Graphics,x:number,y:number,n:number,snow:boolean,small=false){
  const h=(small?17:35)+n*(small?7:26),w=small?9:18;
  g.fillStyle(0x152c2c,.22);g.fillEllipse(x+7,y+6,w*2.5,w);
  g.fillStyle(snow?0x6d7579:0x74694b);g.fillRect(x-2,y-h*.5,4,h*.5);
  if(n>.72&&!snow&&!small){
   g.fillStyle(0xc5c7af);g.fillRect(x-2,y-h*.7,4,h*.7);g.lineStyle(2,0x555e4d);g.lineBetween(x-2,y-10,x+2,y-8);g.lineBetween(x-2,y-19,x+2,y-17);
   g.fillStyle(0x49694a);g.fillEllipse(x,y-h*.65,34,38);g.fillStyle(0x779256);g.fillCircle(x-7,y-h*.8,13);g.fillStyle(0x91a66a);g.fillCircle(x+5,y-h*.91,10);
  }else{
   for(let layer=0;layer<3;layer++){const top=y-h-layer*5,bottom=y-layer*h*.21,half=w*(1-layer*.2);this.poly(g,[x,top,x-half,bottom,x+half,bottom],snow?0x6c9290:0x365b45);this.poly(g,[x,top,x,bottom,x+half,bottom],snow?0xa7c4c5:0x587e4f);if(snow)this.poly(g,[x,top,x-half*.75,bottom-5,x+half*.75,bottom-5],0xe3edf0);}
  }
 }
 drawLocation(sector:number){
  const g=this.terrain,site=location(sector),theme=site.theme;g.clear();this.waterDetails=[];this.wildlife=[];this.nature?.clear();
  const ground=theme==='snow'?0xa8bec4:theme==='canyon'?0x98765a:theme==='islands'?0x647e52:theme==='ruins'?0x536552:0x385a45;
  const water=theme==='snow'?0x769cae:theme==='canyon'?0x447d80:theme==='islands'?0x326b7e:0x396d70;
  this.cameras.main.setBackgroundColor(ground);
  const cells:{x:number;y:number;n:number}[]=[];
  for(let y=-12;y<24;y++)for(let x=-12;x<24;x++){
   const n=terrainNoise(x,y,sector),kind=habitat(sector,x,y),p=iso(x+.5,y+.5);cells.push({x,y,n});
   const shore=kind==='land'&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>habitat(sector,x+dx,y+dy)==='water');
   this.tile(g,x,y,kind==='site'?site.ground:kind==='water'?water:shore?(theme==='snow'?0xd1e0df:theme==='canyon'?0xc4a477:0xa9aa7e):ground);
   this.tile(g,x,y,n>.5?0xffffff:0x0c2027,kind==='site'?.025:.035+n*.035);
   if(kind==='water'){
    g.lineStyle(1,theme==='snow'?0xd2e5eb:0x9bc7c5,.35);g.lineBetween(p.x-14,p.y-3,p.x+5,p.y-3);g.lineBetween(p.x,p.y+5,p.x+17,p.y+5);
    if(theme==='snow'){g.lineStyle(1,0x3f6c81,.5);g.lineBetween(p.x-17,p.y-7,p.x+4,p.y+3);g.lineBetween(p.x+4,p.y+3,p.x-1,p.y+10);}
    if(n>.72&&x>-5&&x<17&&y>-5&&y<17)this.waterDetails.push({x:x+.5,y:y+.5});
   }
   if(kind==='site'){
    const a=iso(x,y);g.lineStyle(.8,0xffffff,.18);g.strokePoints([{x:a.x,y:a.y},{x:a.x+TW,y:a.y+TH},{x:a.x,y:a.y+TH*2},{x:a.x-TW,y:a.y+TH}],true);
    g.lineStyle(2,0xe1d5ae,.65);for(const [dx,dy,ax,ay,bx,by] of [[-1,0,a.x,a.y,a.x-TW,a.y+TH],[0,-1,a.x,a.y,a.x+TW,a.y+TH],[1,0,a.x+TW,a.y+TH,a.x,a.y+TH*2],[0,1,a.x-TW,a.y+TH,a.x,a.y+TH*2]])if(!buildable(sector,x+dx,y+dy))g.lineBetween(ax,ay,bx,by);
   }
  }
  // Draw scenery back-to-front, keeping tall silhouettes away from usable tiles.
  cells.sort((a,b)=>a.x+a.y-b.x-b.y);
  for(const {x,y,n} of cells){
   const kind=habitat(sector,x,y);if(kind!=='land')continue;
   const p=iso(x+.35+n*.3,y+.5),nearSite=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]].some(([dx,dy])=>buildable(sector,x+dx,y+dy));
   const shore=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>habitat(sector,x+dx,y+dy)==='water');
   if(theme==='canyon'){
    if(n>.62){const h=nearSite?12:22+n*30;this.box(g,p.x,p.y,14+n*10,7+n*5,h,0xbb916a,0x775343,0x906348);g.lineStyle(2,0xd1a67d,.6);g.lineBetween(p.x-12,p.y-h+8,p.x+10,p.y-h+16);}
    else if(n>.3){g.lineStyle(3,0x65805c);g.lineBetween(p.x,p.y,p.x,p.y-17);g.lineBetween(p.x,p.y-8,p.x+7,p.y-11);g.lineBetween(p.x+7,p.y-11,p.x+7,p.y-18);}
   }else if(theme==='snow'){
    if(n>.54&&!shore)this.drawTree(g,p.x,p.y,n,true,nearSite);else{g.fillStyle(0xd9e6e8);g.fillEllipse(p.x,p.y,28+n*20,12+n*9);if(n<.2)this.poly(g,[p.x-13,p.y,p.x-3,p.y-11,p.x+14,p.y+2],0x7e969e);}
   }else if(theme==='ruins'&&n>.78){
    this.box(g,p.x,p.y,17,8,nearSite?12:28,0x8a9282,0x525f5a,0x657168);g.fillStyle(0x3b4c47);g.fillRect(p.x-5,p.y-10,5,8);g.lineStyle(3,0x6c985a);g.lineBetween(p.x-12,p.y-18,p.x-8,p.y+2);g.lineBetween(p.x+8,p.y-14,p.x+3,p.y+7);
   }else if(n>(theme==='islands'?.42:.43)&&!shore){this.drawTree(g,p.x,p.y,n,false,nearSite);}
   else{
    g.fillStyle(theme==='ruins'?0x698653:0x5b804f);g.fillEllipse(p.x,p.y-3,19+n*15,10+n*7);g.fillStyle(0x8ca164);g.fillCircle(p.x-5,p.y-6,5);
    g.lineStyle(1,shore?0xc1b477:0x8d9e62);for(let i=0;i<4;i++)g.lineBetween(p.x-12+i*6,p.y+5,p.x-14+i*7,p.y-(shore?13:4)-i%2*4);
    if(n<.25&&!shore){g.fillStyle(theme==='ruins'?0xc6a6cf:0xe2ca87);for(let i=0;i<3;i++)g.fillCircle(p.x-7+i*7,p.y-5+(i%2)*4,1.7);}
   }
   if(!nearSite&&n>.83&&n<.88&&x>=-4&&x<=15&&y>=-4&&y<=15&&this.wildlife.filter(a=>!a.water).length<6)this.wildlife.push({x:x+.5,y:y+.5,water:false});
  }
  if(theme!=='snow')for(const p of this.waterDetails.filter((_,i)=>i%9===0).slice(0,4))this.wildlife.push({...p,water:true});
 }
 drawWildlife(time:number){
  const g=this.nature;g.clear();const theme=location(session.state.sector).theme;
  if(theme!=='snow')for(let i=0;i<this.waterDetails.length;i++){
   const p=iso(this.waterDetails[i].x,this.waterDetails[i].y),phase=(time*.00025+i*.17)%1;
   g.lineStyle(1,0xb6dcd4,.22*(1-phase));g.strokeEllipse(p.x,p.y,10+phase*21,4+phase*10);
  }
  for(let i=0;i<this.wildlife.length;i++){
   const a=this.wildlife[i],p=iso(a.x,a.y),bob=Math.sin(time*.002+i)*1.2,x=p.x,y=p.y+bob;
   g.fillStyle(0x102c30,.18);g.fillEllipse(x,y+4,21,7);
   if(a.water){g.fillStyle(0xe4ddbb);g.fillEllipse(x,y,13,7);g.fillStyle(0x77967b);g.fillCircle(x+5,y-5,3);g.fillStyle(0xe6b46b);g.fillTriangle(x+7,y-6,x+12,y-4,x+7,y-3);}
   else{
    const snow=theme==='snow';g.lineStyle(2,snow?0x849da3:0x66503f);for(const dx of [-6,5])g.lineBetween(x+dx,y,x+dx+(i%2?1:-1),y+7);
    g.fillStyle(snow?0xe2e6df:theme==='canyon'?0xb9976b:0xb18c65);g.fillEllipse(x,y-3,19,9);g.fillCircle(x+9,y-8,4);g.fillTriangle(x+7,y-10,x+7,y-16,x+10,y-11);g.fillTriangle(x+10,y-10,x+12,y-15,x+13,y-9);g.fillStyle(0x293a35);g.fillCircle(x+11,y-9,1);
   }
  }
  // Small flocks circle outside the construction area, away from combat targets.
  for(let i=0;i<5;i++){const a=time*.00006+i*1.25,p=iso(5.5+Math.cos(a)*10,5.5+Math.sin(a)*10),flap=2+Math.sin(time*.009+i)*2;g.lineStyle(1.5,theme==='snow'?0x455e69:0xc3d1bd,.7);g.lineBetween(p.x-5,p.y-flap-55,p.x,p.y-55);g.lineBetween(p.x,p.y-55,p.x+5,p.y-flap-55);}
 }
 pigFrame(sprite:Phaser.GameObjects.Image,row:keyof typeof PIG_ROWS,col:number){
  const width=PIG_COLUMNS[col+1]-PIG_COLUMNS[col];sprite.setTexture('mecha-pig',`${row}-${col}`).setOrigin((PIG_PIVOTS[col]-PIG_COLUMNS[col])/width,1).setScale(.46);
 }
 building(b:Building,time:number){
  let view=this.buildingViews.get(b.id);if(!view){const depth=(b.x+b.y)*3+10;view={base:this.add.graphics().setDepth(depth),overlay:this.add.graphics().setDepth(depth+2)};this.buildingViews.set(b.id,view);}
  view.base.setDepth((b.x+b.y)*3+10).clear();view.overlay.setDepth((b.x+b.y)*3+12).clear();let g=view.base;const p=iso(b.x+.5,b.y+.5),c=TYPES[b.kind].color,l=b.level,x=p.x,y=p.y-9;
  const illustrated=b.kind==='server'||b.kind==='orbital';
  if(illustrated){
   const texture=b.kind==='server'?'server-levels':'orbital',frame=b.kind==='server'?`level-${l}`:'building';
   if(!view.sprite)view.sprite=this.add.image(x,p.y+18,texture,frame).setOrigin(.5,.96).setDepth((b.x+b.y)*3+11);
   const r=b.kind==='server'?SERVER_FRAMES[l-1]:ORBITAL_FRAME,width=b.kind==='server'?84+(l-1)*2:94;
   view.sprite.setPosition(x,p.y+18).setDepth((b.x+b.y)*3+11).setTexture(texture,frame).setDisplaySize(width,width*r[3]/r[2]).setTint(b.upgradeLeft?0x9aabb4:0xffffff);
  }else{view.sprite?.destroy();view.sprite=undefined;g.fillStyle(0x162b2c,.22);g.fillEllipse(x+6,y+27,69,29);this.box(g,x,y,32,16,5,0x86958b,0x53685f,0x435b54);}

  if(session.selected===b.id){this.tile(g,b.x,b.y,0xd8ed95,.35);g.lineStyle(2,0xc8e88f,.9);g.strokeEllipse(x,y+18,76,40);}

  if(b.kind==='power'){this.box(g,x,y,26,13,20,0xb7b5a0,0x8b8974,0x666e66);for(let i=0;i<3;i++){this.box(g,x-16+i*15,y-20+i*2,7,4,18+l*4,0xe8cc82,0x9c946f,0x676f62);g.lineStyle(4,0x384b4d);g.lineBetween(x-16+i*15,y-40+i*2,x-16+i*15,y-50+i*2);}g.lineStyle(3,0xdbc376);g.lineBetween(x-16,y-46,x+14,y-42);this.poly(g,[x+5,y-18,x-2,y-7,x+4,y-6,x,y+4,x+12,y-10,x+6,y-10],0xffdc76);}
  if(b.kind==='cooler'){this.box(g,x,y,28,14,20,0xb3d3ca,0x79a49e,0x527c7f);for(let i=0;i<2;i++){const fx=x-13+i*26,fy=y-13+i*2;g.fillStyle(0x395e67);g.fillEllipse(fx,fy,23,13);g.lineStyle(2,0x93c6c5);g.strokeEllipse(fx,fy,23,13);for(let j=0;j<3;j++){const a=time*.003+j*Math.PI*2/3;g.lineStyle(3,0xb5d2cd);g.lineBetween(fx,fy,fx+Math.cos(a)*8,fy+Math.sin(a)*4);}}g.lineStyle(4,0x79c9cc);g.lineBetween(x+5,y+18,x+22,y+10);}
  if(b.kind==='radar'){this.box(g,x,y,23,12,15,0xbbbfd0,0x808a9e,0x59687f);g.lineStyle(6,0xb6c6cb);g.lineBetween(x,y,x,y-48);const angle=Math.sin(time*.0008);g.fillStyle(0xd5d6df);g.fillEllipse(x,y-48,40,23);g.lineStyle(3,0x8096a9);g.strokeEllipse(x,y-48,40,23);g.lineBetween(x,y-48,x+angle*25,y-69);g.fillStyle(c);g.fillCircle(x+angle*25,y-69,3);}
  if(b.kind==='defense'){this.box(g,x,y,25,13,16,0x95a993,0x687d65,0x4c6658);g.fillStyle(0x3a534c);g.fillEllipse(x,y-14,31,20);this.box(g,x,y-18,13,7,10,0xb7c3a1,0x7c9575,0x667b64);g.lineStyle(7,0x3e554c);g.lineBetween(x-7,y-22,x+13,y-49);g.lineBetween(x+2,y-18,x+22,y-45);g.lineStyle(3,0xd1c7a0);g.lineBetween(x+12,y-48,x+18,y-56);g.lineBetween(x+21,y-44,x+27,y-52);g.fillStyle(c);g.fillRect(x-12,y-7,6,4);}
  if(b.kind==='repair'){this.box(g,x,y,27,14,25,0xc5b997,0x9c997b,0x6f806c);this.box(g,x,y-26,29,15,4,0xa8c57e,0x7c995e,0x60794e);g.fillStyle(0x374f4b);g.fillRect(x+4,y-6,11,22);g.lineStyle(4,0xf5d19a);g.lineBetween(x-16,y-10,x-7,y-6);g.lineBetween(x-12,y-15,x-12,y-2);}
  if(b.kind==='depot'){this.box(g,x,y,29,15,26,0xcab78d,0x8d8060,0x686d53);this.box(g,x,y-27,31,16,5,0x78916a,0x586f50,0x405b43);g.fillStyle(0x263b35);g.fillRect(x+3,y-8,17,25);g.lineStyle(2,0xe5c680);g.strokeRect(x+3,y-8,17,25);for(let i=0;i<3;i++)this.box(g,x-19+i*6,y+2+i*3,5,3,9,0xd0b477,0x9c8659,0x786846);}
  const alerts=buildingAlerts(session.state,b);
  if(alerts.length){if(!view.alerts)view.alerts=this.add.text(0,0,'',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#ffe2ac',backgroundColor:'#462c25',padding:{x:4,y:3}}).setOrigin(.5,1).setDepth(1003);view.alerts.setVisible(true).setText(alerts.map(a=>a.code).join(' · ')).setPosition(x,y-(b.kind==='server'?72:55));}else view.alerts?.setVisible(false);
  g=view.overlay;
  if(b.kind==='defense'&&b.specialization){g.fillStyle(b.specialization==='flak'?0x79dbca:0xf0b46f);g.fillCircle(x+22,y-19,5);}
  if(b.kind==='defense'){for(let i=0;i<ammoCapacity(session.state);i++){g.fillStyle(i<(b.ammo??AMMO_CAPACITY)?0xe8c983:0x334a43);g.fillRect(x-22+i*(48/ammoCapacity(session.state)),y+41,48/ammoCapacity(session.state)-2,4);}}
  if(b.upgradeLeft){this.tile(g,b.x,b.y,0xdda85c,.25);g.lineStyle(3,0xf2c477);g.lineBetween(x-24,y+10,x+24,y+10);for(let i=0;i<5;i++){g.lineStyle(3,i%2?0x263b35:0xeac473);g.lineBetween(x-20+i*10,y+5,x-15+i*10,y+15);}g.fillStyle(0x20322d);g.fillRect(x-22,y+48,44,4);g.fillStyle(0xf2c477);g.fillRect(x-22,y+48,44*(1-b.upgradeLeft/UPGRADE_SECONDS),4);}
  if(l>1){g.fillStyle(0xe8d59b);for(let i=0;i<l;i++)g.fillCircle(x-8+i*7,y+28,2);}
  if(b.hp<maxHp(b)*.98){g.fillStyle(0x132a2c);g.fillRect(x-22,y+33,44,4);g.fillStyle(b.hp<maxHp(b)*.4?0xee8c72:0xa9cd85);g.fillRect(x-22,y+33,44*b.hp/maxHp(b),4);}
 }
 update(time:number,delta:number){step(Math.min(delta/1000,.05));const g=this.g;g.clear();const s=session.state;if(this.pigState!==s){for(const view of this.pigViews.values())view.sprite.destroy();this.pigViews.clear();this.pigState=s;}
  for(const [id,view] of this.pigViews)if(!s.enemies.some(e=>e.id===id&&e.kind==='pig')){view.deathAt??=time;const elapsed=(time-view.deathAt)/1000;if(elapsed>=1.1){view.sprite.destroy();this.pigViews.delete(id);}else{this.pigFrame(view.sprite,'death',Math.min(7,2+Math.floor(elapsed/1.1*6)));view.sprite.setAlpha(Math.min(1,(1.1-elapsed)*4));}}
  if(this.terrainSector!==(s.sector??1))this.drawTerrain();this.drawWildlife(time);for(const [id,view] of this.buildingViews){if(!s.buildings.some(b=>b.id===id)){view.base.destroy();view.overlay.destroy();view.sprite?.destroy();view.alerts?.destroy();this.buildingViews.delete(id);}}if(this.orbitalRocket)this.orbitalRocket.setVisible(false);for(const [id,sprite] of this.rareSprites){if(!s.enemies.some(e=>e.id===id&&e.kind==='barrel')){sprite.destroy();this.rareSprites.delete(id);}}
  const intel=waveIntel(s,s.phase==='attack'?s.wave:s.wave===0?1:11);
  if(intel){const points=[iso(-.8,5.5),iso(12.8,5.5),iso(5.5,-.8),iso(5.5,12.8)],p=points[intel.edge];if(!this.intelLabel)this.intelLabel=this.add.text(0,0,'',{fontFamily:'Arial',fontSize:'12px',color:'#f6d59d',backgroundColor:'#273c35',padding:{x:6,y:4}}).setOrigin(.5).setDepth(1003);this.intelLabel.setPosition(p.x,p.y).setText(`${intel.direction}\nОсновной подход · волна ${intel.wave}`).setVisible(true);}else this.intelLabel?.setVisible(false);
  const selected=s.buildings.find(b=>b.id===session.selected);if(selected?.kind==='defense'){const range=defenseRange(s,selected);const p=iso(selected.x+.5,selected.y+.5);g.lineStyle(1.5,0xbce3a1,.5);g.fillStyle(0xaadf94,.06);g.fillEllipse(p.x,p.y,range*TW*2.828,range*TH*2.828);g.strokeEllipse(p.x,p.y,range*TW*2.828,range*TH*2.828);}
  if(session.placing&&this.hover){const {x,y}=this.hover;if(x>=0&&y>=0&&x<SIZE&&y<SIZE)this.tile(g,x,y,!buildable(s.sector,x,y)||occupied(s,x,y)||s.money<TYPES[session.placing].cost?0xec8b72:0xc0e79c,.65);}
  [...s.buildings].sort((a,b)=>a.x+a.y-b.x-b.y).forEach(b=>this.building(b,time));
  for(const truck of s.trucks??[]){
   if(truck.depot===session.selected||truck.stops.includes(session.selected)){
    const route=supplyRoute(s,truck);g.lineStyle(3,0xf3cc77,.8);for(let i=1;i<route.length;i++){const a=iso(route[i-1].x+.5,route[i-1].y+.5),b=iso(route[i].x+.5,route[i].y+.5);g.lineBetween(a.x,a.y,b.x,b.y);}
    for(const id of [...truck.stops,truck.depot]){const stop=s.buildings.find(b=>b.id===id);if(stop){const p=iso(stop.x+.5,stop.y+.5);g.lineStyle(2,id===truck.depot?0x8ed9cb:0xf3cc77);g.strokeEllipse(p.x,p.y,32,16);}}
   }
   const p=iso(truck.x+.5,truck.y+.5),x=p.x,y=p.y-4;g.fillStyle(0x142920,.3);g.fillEllipse(x,y+8,35,16);for(const dx of [-12,12]){g.fillStyle(0x172724);g.fillEllipse(x+dx,y+8,7,10);}this.box(g,x-5,y-2,17,8,10,0xa3b183,0x6f805a,0x4e644b);this.box(g,x+9,y-8,9,5,12,0xe0c58b,0x8d9472,0x627562);g.fillStyle(0x86b9c4);g.fillRect(x+7,y-15,8,5);g.fillStyle(0xf5dea3);g.fillCircle(x+16,y,2);if(truck.stops.length){g.fillStyle(0xe1b977);g.fillRect(x-13,y-13,12,6);}}
  for(const e of s.enemies){const p=iso(e.x+.5,e.y+.5);if(e.kind==='pig'){
   let view=this.pigViews.get(e.id);if(!view){view={sprite:this.add.image(p.x,p.y+12,'mecha-pig','idle-0'),lastX:e.x,lastY:e.y};this.pigViews.set(e.id,view);}
   const moving=Math.hypot(e.x-view.lastX,e.y-view.lastY)>.00001;
   let row:keyof typeof PIG_ROWS='idle',frame=Math.floor(s.elapsed*8+e.id)%8;
   if((e.pigSpawnLeft??0)>0){row='open';frame=Math.min(7,Math.floor((.8-e.pigSpawnLeft!)/.8*8));}
   else if((e.pigAttackLeft??0)>0){row='attack';frame=Math.min(7,Math.floor((.9-e.pigAttackLeft!)/.9*8));}
   else if((e.pigHitLeft??0)>0){row='hurt';frame=Math.min(5,2+Math.floor((.4-e.pigHitLeft!)/.4*4));}
   else if(moving){row='walk';frame=Math.floor(s.elapsed*10+e.id)%8;}
   const target=s.buildings.find(b=>b.id===e.target),heading=moving?(e.x-view.lastX)-(e.y-view.lastY):target?(target.x-e.x)-(target.y-e.y):0;
   this.pigFrame(view.sprite,row,frame);view.sprite.setPosition(p.x,p.y+12).setDepth((e.x+e.y)*3+15);if(Math.abs(heading)>.000001)view.sprite.setFlipX(heading>0);view.lastX=e.x;view.lastY=e.y;
   g.fillStyle(0x14252b);g.fillRect(p.x-22,p.y-61,44,4);g.fillStyle(0xf18ea4);g.fillRect(p.x-22,p.y-61,44*Math.max(0,e.hp/e.maxHp),4);continue;
  }if(e.kind==='barrel'){
   let sprite=this.rareSprites.get(e.id);if(!sprite){sprite=this.add.image(p.x,p.y-50,'barrel-pilot').setDisplaySize(126,84).setDepth(1001);this.rareSprites.set(e.id,sprite);}
   const target=s.buildings.find(b=>b.id===e.target),heading=e.retreat?e.retreat.x-e.retreat.y:target?(target.x-e.x)-(target.y-e.y):0;
   sprite.setPosition(p.x,p.y-50+Math.sin(time*.004+e.id)*3).setFlipX(heading>0).setRotation(Math.sin(time*.003+e.id)*.035);
   g.fillStyle(0x102522,.25);g.fillEllipse(p.x,p.y+9,65,24);g.lineStyle(1,0xf0cf75,.75);g.strokeEllipse(p.x,p.y+9,68,27);g.fillStyle(0x152b30);g.fillRect(p.x-24,p.y-104,48,5);g.fillStyle(0xf0cf75);g.fillRect(p.x-24,p.y-104,48*e.hp/e.maxHp,5);continue;
  }
  if(e.kind==='boss'){
   const type=e.bossType??bossType(s.sector),profile=BOSSES[type],x=p.x,y=p.y-55;
   if(type==='jammer'||type==='frost'){g.lineStyle(2,profile.color,.25+.1*Math.sin(time*.004));g.strokeEllipse(p.x,p.y,5*TW*2.828,5*TH*2.828);}
   g.fillStyle(0x0b2028,.3);g.fillEllipse(p.x,p.y+12,100,42);
   this.poly(g,[x-58,y+5,x-25,y-20,x+25,y-20,x+58,y+5,x+23,y+21,x-23,y+21],0x354957);
   this.poly(g,[x,y-35,x+22,y,x,y+30,x-22,y],profile.color);
   g.lineStyle(3,0xd2dcd8);g.lineBetween(x-42,y-4,x+42,y-4);
   if(type==='carrier'){for(const dx of [-38,38]){g.fillStyle(0x152d37);g.fillRect(x+dx-9,y,18,12);g.lineStyle(2,profile.color);g.strokeEllipse(x+dx,y-12,22,10);}}
   if(type==='siege'){for(const dx of [-35,-20,20,35]){g.lineStyle(6,profile.color);g.lineBetween(x+dx,y+5,x+dx+7,y-22);}g.lineStyle(4,0xe6b997);g.strokeRect(x-13,y-13,26,29);}
   if(type==='jammer'){g.lineStyle(2,profile.color);for(let i=0;i<3;i++)g.strokeEllipse(x,y-27,20+i*19,10+i*10);}
   if(type==='frost'){g.lineStyle(3,0xd7f7ff);for(let i=0;i<6;i++){const a=i*Math.PI/3+time*.0003;g.lineBetween(x,y,x+Math.cos(a)*29,y+Math.sin(a)*18);}}
   if(type==='repair'){g.fillStyle(0xd4ffe0);g.fillRect(x-4,y-13,8,28);g.fillRect(x-14,y-3,28,8);g.lineStyle(2,profile.color);g.strokeEllipse(x,y,65,36);}
   g.fillStyle(0x152b30);g.fillRect(x-36,y-48,72,5);g.fillStyle(profile.color);g.fillRect(x-36,y-48,72*e.hp/e.maxHp,5);continue;
  }g.fillStyle(0x0d2529,.2);g.fillEllipse(p.x+14,p.y+20,24,12);const y=p.y-43;const big=e.kind==='heavy'?1.4:e.mini?.65:1;g.lineStyle(3,0xc7d4d2);if(e.kind==='missile'){g.lineBetween(p.x-9,y-9,p.x+9,y+9);g.lineStyle(2,0xf8bb7c,.7);g.lineBetween(p.x-9,y-9,p.x-20,y-20);}else{g.lineBetween(p.x-12*big,y-6*big,p.x+12*big,y+6*big);g.lineBetween(p.x-12*big,y+6*big,p.x+12*big,y-6*big);for(const [dx,dy] of [[-12,-6],[12,6],[-12,6],[12,-6]]){g.lineStyle(1,0xd9e2d7,.7);g.strokeEllipse(p.x+dx*big,y+dy*big,12*big,6*big);}}g.fillStyle(e.retreat?0x84d9cf:0xe99476);g.fillCircle(p.x,y,4*big);g.fillStyle(0x152b30);g.fillRect(p.x-12,y-19*big,24,3);g.fillStyle(0xefab85);g.fillRect(p.x-12,y-19*big,24*e.hp/e.maxHp,3);}
  if(s.satellite){
   const a=s.satellite,p=iso(a.x+.5,a.y+.5),t=a.progress/SATELLITE_FLIGHT,ease=Math.pow(t,1.5);
   const target=s.buildings.find(b=>b.id===a.target),roof=p.y-50-(target?.level??1)*6;
   const x=p.x-280*(1-ease),y=roof-480*(1-ease),pulse=.45+Math.sin(a.progress*8)*.2;
   g.lineStyle(2,0xffbc72,pulse);g.strokeEllipse(p.x,p.y,68,34);
   g.fillStyle(0x15252b,.15+t*.25);g.fillEllipse(p.x,p.y,16+t*28,8+t*14);
   for(let i=6;i>=1;i--){g.fillStyle(i%2?0xffb45e:0xf5dc9b,(1-i/7)*.55);g.fillCircle(x-i*10,y-i*17,3+i*1.6);}
   if(a.interceptor){
    const origin=iso(a.interceptor.x+.5,a.interceptor.y+.5),flight=Math.min(1,a.interceptor.progress),sx=origin.x,sy=origin.y-45;
    const rx=sx+(x-sx)*flight,ry=sy+(y-sy)*flight,angle=Math.atan2(y-sy,x-sx)+Math.PI/2;
    if(!this.orbitalRocket)this.orbitalRocket=this.add.image(rx,ry,'orbital','rocket').setDisplaySize(10,32).setDepth(1002);
    this.orbitalRocket.setVisible(true).setPosition(rx,ry).setRotation(angle);
    g.lineStyle(3,0xffd385,.7);g.lineBetween(sx,sy,rx,ry);
   }
   g.save();g.translateCanvas(x,y);g.rotateCanvas(-.5+t*2.4);
   g.lineStyle(3,0xc6d6df);g.lineBetween(-40,0,40,0);
   for(const px of [-43,17]){g.fillStyle(0x315e93);g.fillRect(px,-13,26,26);g.lineStyle(1,0x8ccbe5);g.strokeRect(px,-13,26,26);for(let j=1;j<3;j++){g.lineBetween(px+j*26/3,-13,px+j*26/3,13);g.lineBetween(px,-13+j*26/3,px+26,-13+j*26/3);}}
   g.fillStyle(0xdde2d7);g.fillRoundedRect(-11,-16,22,32,4);g.fillStyle(0xd9b76e);g.fillRect(-7,-10,14,18);g.lineStyle(2,0xf5ece0);g.lineBetween(0,-16,0,-29);g.strokeCircle(0,-29,5);g.restore();
  }
  for(const e of s.effects){const p=iso(e.x+.5,e.y+.5),t=iso(e.tx+.5,e.ty+.5);if(e.kind==='intercept'){const cx=p.x+e.tx,cy=p.y+e.ty,age=.8-e.life;g.lineStyle(3,0xffd482,e.life/.8);g.strokeCircle(cx,cy,12+age*65);g.fillStyle(0xffedb1,e.life*.8);g.fillCircle(cx,cy,8+age*16);for(let i=0;i<8;i++){const a=i*Math.PI/4;g.fillStyle(0xd1e1e4,e.life);g.fillRect(cx+Math.cos(a)*age*75,cy+Math.sin(a)*age*75,4,4);}}else if(e.kind==='shot'){g.lineStyle(2,0xfce8ac,e.life/.18);g.lineBetween(p.x,p.y-37,t.x,t.y-43);}else{g.lineStyle(3,0xf3b77e,e.life/.65);g.strokeCircle(p.x,p.y-25,(.65-e.life)*50);g.fillStyle(0xfcd5a0,e.life*.5);g.fillCircle(p.x,p.y-25,e.life*20);}}
 }
}
