import {BOSSES,bossType,bossInfo,type BossType} from './bosses.ts';
import {buildable,location,terrainPath,conditions,mapCells,routeChoices,victoryReward} from './maps.ts';
export type Kind = 'server' | 'power' | 'cooler' | 'radar' | 'defense' | 'repair' | 'depot' | 'orbital';
export type Tech = 'compute' | 'energy' | 'security' | 'automation';
export type Specialization='flak'|'rocket';
export type Priority='nearest'|'missile'|'heavy';
export type Perk='delivery'|'ammo'|'repair';
export const PERKS:Record<Perk,{name:string;description:string}>={delivery:{name:'Быстрая доставка',description:'Машины +30% скорости, ремонт дороже на 25%.'},ammo:{name:'Запас боеприпасов',description:'8 зарядов вместо 6, машины медленнее на 15%.'},repair:{name:'Ремонтная бригада',description:'Ремонт дешевле на 30%, доход от заказов −10%.'}};
export type Bonus = 'shield' | 'reserve' | 'budget';
export const SIZE = 12;
export const TYPES: Record<Kind, { name: string; short: string; icon: string; cost: number; hp: number; power: number; color: number; description: string }> = {
 server: {name:'Серверный корпус',short:'Серверная',icon:'▤',cost:260,hp:220,power:18,color:0x70c7de,description:'Пять уровней: от начального корпуса до гипермасштабного ЦОД. Выполняет оплачиваемые заказы волны. Доход зависит от мощности, здоровья и доступных заказов. Требует 18 МВт и 16 единиц охлаждения на уровень.'},
 power: {name:'Электроподстанция',short:'Подстанция',icon:'ϟ',cost:200,hp:180,power:0,color:0xefc365,description:'Вырабатывает 65 МВт на уровень. Повреждения снижают доступную мощность.'},
 cooler: {name:'Холодильная станция',short:'Охлаждение',icon:'❄',cost:160,hp:170,power:6,color:0x84d9cf,description:'Отводит 50 единиц тепла на уровень. Без охлаждения падает доход и повреждаются серверы.'},
 radar: {name:'Радиолокационная станция',short:'Радар',icon:'◉',cost:210,hp:150,power:5,color:0xb3b0f4,description:'Увеличивает радиус всех перехватчиков на 30%. Бонус растёт с уровнем радара.'},
 defense: {name:'Комплекс перехвата',short:'Перехватчик',icon:'⌖',cost:240,hp:200,power:10,color:0xe89a72,description:'Перехватывает цели в радиусе 5 клеток на первом уровне. Приоритет цели настраивается. При улучшении можно выбрать зенитную специализацию против групп или ракетную против тяжёлых целей. Боекомплект пополняет склад.'},
 orbital: {name:'Орбитальный перехватчик',short:'Орбитальная ПВО',icon:'↟',cost:1000,hp:320,power:8,color:0xe1bd67,description:'Сбивает падающие спутники по всей карте. Требует питание, перезарядка 3,5 с. Максимум одна установка. Без улучшений, боекомплект автономный.'},
 depot: {name:'Склад боекомплектов',short:'Склад БК',icon:'▣',cost:180,hp:180,power:0,color:0xd3b27e,description:'Снабжает ПВО боеприпасами. Одна машина пополняет до двух пустых ПВО за рейс и возвращается на склад. Максимум два склада, без улучшений.'},
 repair: {name:'Ремонтная мастерская',short:'Мастерская',icon:'⚒',cost:180,hp:170,power:5,color:0x9fc277,description:'Восстанавливает здания: 4 HP/с на уровень. Расходует запчасти, получаемые за волны.'}
};
export const TECHS: Record<Tech,{name:string;description:string;icon:string}> = {
 compute:{name:'Вычисления',description:'+15% скорости оплаты заказов за уровень',icon:'▤'},energy:{name:'Энергетика',description:'+20% выработки за уровень',icon:'ϟ'},security:{name:'Безопасность',description:'+25% урона за уровень',icon:'⌖'},automation:{name:'Автоматизация',description:'Авторемонт +2 HP/с за уровень',icon:'⚒'}
};
export interface Building { id:number; kind:Kind; x:number; y:number; level:number; hp:number; cooldown:number;refundable?:boolean;ammo?:number;upgradeLeft?:number;specialization?:Specialization;pendingSpecialization?:Specialization;priority?:Priority;lastDamage?:string;resupplyRequested?:boolean }
export interface Enemy { id:number; kind:'drone'|'missile'|'heavy'|'boss'|'barrel'|'pig'; x:number;y:number;hp:number;maxHp:number;speed:number;damage:number;target:number;pigAttackLeft?:number;pigHitLeft?:number;pigSpawnLeft?:number;bossType?:BossType;abilityIn?:number;mini?:boolean;summoned?:boolean;launchIn?:number;retreat?:{x:number;y:number} }
export interface Effect {x:number;y:number;tx:number;ty:number;life:number;kind:'shot'|'blast'|'intercept'}
export const SATELLITE_FLIGHT=4.5;
export interface Satellite {target:number;x:number;y:number;progress:number;interceptor?:{x:number;y:number;progress:number}}
export const AMMO_CAPACITY=6;
export const UPGRADE_SECONDS=8;
export const ammoCapacity=(s:State)=>s.perk==='ammo'?8:AMMO_CAPACITY;
export const repairPrice=(s:State)=>conditions(s.sector).repair*(s.perk==='repair'?.7:s.perk==='delivery'?1.25:1);
export const operational=(b:Building)=>b.hp>0&&!(b.upgradeLeft&&b.upgradeLeft>0);
export interface SupplyTruck {id:number;depot:number;x:number;y:number;stops:number[]}
export interface State {version:1;satelliteWarningDismissed?:boolean;sector?:number;entryReward?:number;perk?:Perk;emergencyWave?:number;defeatReason?:string;waveEarnings?:number;rareSpawned?:boolean;trucks?:SupplyTruck[];satellite?:Satellite;satelliteAt?:number;satelliteDone?:boolean;satelliteRemaining?:number;satelliteWave?:number;starlink?:'pending'|'disabled'|'kept';money:number;parts:number;science:number;wave:number;phase:'build'|'attack'|'won'|'lost';buildings:Building[];enemies:Enemy[];effects:Effect[];tech:Record<Tech,number>;bonus:Bonus;remaining:number;spawnIn:number;elapsed:number;reputation:number;kills:number;nextId:number;event:string;log:string[];}
export const waveIncomeLimit=(wave:number)=>300+90*wave;
export const maxLevel=(b:Pick<Building,'kind'>)=>b.kind==='server'?5:b.kind==='depot'||b.kind==='orbital'?1:3;
export const satelliteCount=(wave:number)=>wave===10?10:wave>=7?3:wave>=4?1:0;
export const maxHp=(b:Building)=>TYPES[b.kind].hp*(1+(b.level-1)*.65);
export const upgradeCost=(b:Building)=>Math.round(TYPES[b.kind].cost*b.level*.8);
export const occupied=(s:State,x:number,y:number)=>s.buildings.find(b=>b.x===x&&b.y===y);
export function fresh(sector=1,perk?:Perk,entryReward?:number):State {
 const s:State={version:1,sector,perk,entryReward,money:850,parts:80,science:0,wave:0,phase:'build',buildings:[],enemies:[],effects:[],tech:{compute:0,energy:0,security:0,automation:0},bonus:'shield',remaining:0,spawnIn:0,elapsed:0,reputation:100,kills:0,nextId:1,event:'Системы готовы. Расширьте базу и подготовьте оборону.',log:[`Добро пожаловать на площадку «${location(sector).name}».`]};
 for (const [kind,x,y] of [['server',5,5],['power',4,6],['cooler',6,5],['defense',4,3]] as [Kind,number,number][]) s.buildings.push({id:s.nextId++,kind,x,y,level:1,hp:TYPES[kind].hp,cooldown:0,...(kind==='defense'?{ammo:ammoCapacity(s)}:{})});
 if(entryReward!==undefined){const reward=victoryReward(entryReward);s.money+=reward.money;s.parts+=reward.parts;s.science+=reward.science;s.log.unshift(`Награда за предыдущую победу: ${reward.label}.`);}
 return s;
}
export function nextSector(s:State,perk?:Perk,destination=(s.sector??1)+1):State|null {return s.phase==='won'&&s.wave===10&&routeChoices(s.sector).includes(destination)?fresh(destination,perk,s.sector??1):null;}
export function metrics(s:State) {
 let power=0,demand=0,cooling=0,heat=0,compute=0;
 for(const b of s.buildings){if(!operational(b))continue;const health=b.hp/maxHp(b);demand+=TYPES[b.kind].power*b.level;if(b.kind==='power')power+=65*b.level*health*(1+s.tech.energy*.2);if(b.kind==='cooler')cooling+=50*b.level*health;if(b.kind==='server'){heat+=16*b.level;compute+=10*b.level*health;}}
 const climate=conditions(s.sector);power*=climate.power;cooling*=climate.cooling;
 if(s.phase==='attack'&&s.bonus==='reserve'){power+=60;cooling+=40;}
 if(s.phase==='attack'&&s.wave%3===0)power*=.75;
 const supply=Math.min(1,power/Math.max(1,demand));cooling*=supply;
 const efficiency=supply*Math.min(1,cooling/Math.max(1,heat));
 const effectiveCompute=compute*efficiency;
 // Contracts grow by wave; large farms still work faster but have diminishing returns.
 const incomeLimit=waveIncomeLimit(s.wave),incomeRemaining=Math.max(0,incomeLimit-(s.waveEarnings??0));
 const incomeRate=effectiveCompute*.5/(1+.06*Math.max(0,effectiveCompute/10-1))*(1+s.tech.compute*.15)*(s.bonus==='budget'?.75:1)*(s.perk==='repair'?.9:1);
 const income=s.phase==='attack'&&incomeRemaining>0?incomeRate:0;
 return {power,demand,cooling,heat,compute:effectiveCompute,efficiency,income,incomeRate,incomeLimit,incomeRemaining,supply};
}
export function log(s:State,msg:string){s.log=[msg,...s.log].slice(0,8);}
export function build(s:State,kind:Kind,x:number,y:number):boolean {
 if(kind==='orbital'&&s.buildings.some(b=>b.kind==='orbital'&&b.hp>0))return false;
 if(kind==='depot'&&s.buildings.filter(b=>b.kind==='depot'&&b.hp>0).length>=2)return false;
 if(!['build','attack'].includes(s.phase)||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=SIZE||y>=SIZE||!buildable(s.sector,x,y)||occupied(s,x,y)||s.money<TYPES[kind].cost)return false;
 s.money-=TYPES[kind].cost;s.buildings.push({id:s.nextId++,kind,x,y,level:1,hp:TYPES[kind].hp,cooldown:0,...(kind==='defense'?{ammo:ammoCapacity(s)}:{}),refundable:true});log(s,`${TYPES[kind].short}: строительство завершено.`);return true;
}
export function cancelBuilding(s:State,id:number){
 const b=s.buildings.find(b=>b.id===id);
 if(s.phase!=='build'||s.wave!==0||!b?.refundable)return false;
 s.money+=TYPES[b.kind].cost;if(b.upgradeLeft)s.money+=upgradeCost(b);
 for(let level=1;level<b.level;level++)s.money+=Math.round(TYPES[b.kind].cost*level*.8);
 s.buildings=s.buildings.filter(a=>a.id!==id);log(s,`${TYPES[b.kind].short}: постройка отменена, бюджет возвращён.`);return true;
}
export function upgrade(s:State,id:number,specialization?:Specialization){const b=s.buildings.find(b=>b.id===id);if(!['build','attack'].includes(s.phase)||!b||b.upgradeLeft||b.level>=maxLevel(b)||s.money<upgradeCost(b))return false;if(specialization&&(!['flak','rocket'].includes(specialization)||b.kind!=='defense'||b.specialization))return false;s.money-=upgradeCost(b);b.upgradeLeft=UPGRADE_SECONDS;if(specialization)b.pendingSpecialization=specialization;log(s,`${TYPES[b.kind].short}: отключена на улучшение (${UPGRADE_SECONDS} с).`);return true;}
function updateUpgrades(s:State,dt:number){
 for(const b of s.buildings){if(!b.upgradeLeft||b.hp<=0)continue;b.upgradeLeft=Math.max(0,b.upgradeLeft-dt);if(b.upgradeLeft===0){const ratio=b.hp/maxHp(b);b.level++;b.hp=maxHp(b)*ratio;if(b.pendingSpecialization){b.specialization=b.pendingSpecialization;delete b.pendingSpecialization;}log(s,`${TYPES[b.kind].short}: улучшение завершено, уровень ${b.level}.`);}}
}
export function requestResupply(s:State,id:number){
 const b=s.buildings.find(b=>b.id===id);
 if(!['build','attack'].includes(s.phase)||!b||b.kind!=='defense'||b.hp<=0||(b.ammo??ammoCapacity(s))>=ammoCapacity(s)||b.resupplyRequested||(s.trucks??[]).some(t=>t.stops.includes(id)))return false;
 b.resupplyRequested=true;log(s,`ПВО №${id}: заявка на пополнение отправлена.`);return true;
}
export function supplyLeg(s:State,from:{x:number;y:number},target:{x:number;y:number}){
 if((s.sector??1)===1||Math.hypot(from.x-target.x,from.y-target.y)<.001)return [from,target];
 const routes=[...new Set([Math.floor(from.x),Math.ceil(from.x)])].flatMap(x=>[...new Set([Math.floor(from.y),Math.ceil(from.y)])].map(y=>({x,y})))
 .filter(p=>buildable(s.sector,p.x,p.y)).map(p=>({p,path:terrainPath(s.sector,p,target)})).filter(r=>r.path.length)
 .sort((a,b)=>(a.path.length+Math.hypot(a.p.x-from.x,a.p.y-from.y))-(b.path.length+Math.hypot(b.p.x-from.x,b.p.y-from.y)));
 const route=routes[0];return route?[from,...route.path.filter((p,i)=>i>0||Math.hypot(p.x-from.x,p.y-from.y)>.001)]:[from];
}
export function supplyRoute(s:State,t:SupplyTruck){
 const path:{x:number;y:number}[]=[{x:t.x,y:t.y}];
 for(const id of [...t.stops,t.depot]){const target=s.buildings.find(b=>b.id===id&&b.hp>0);if(target)path.push(...supplyLeg(s,path[path.length-1],target).slice(1));}return path;
}
export function buildingAlerts(s:State,b:Building,m=metrics(s)){
 const alerts:{code:string;message:string}[]=[];if(b.upgradeLeft){alerts.push({code:'↑',message:`Улучшение: ${Math.ceil(b.upgradeLeft)} с`});return alerts;}
 if(b.kind==='defense'&&(b.ammo??ammoCapacity(s))===0)alerts.push({code:'БК 0',message:'Нет боеприпасов — ПВО не стреляет'});
 if(TYPES[b.kind].power>0&&m.supply<.99)alerts.push({code:'ТОК',message:m.supply<=.1?'Нет питания':'Недостаточно энергии'});
 if(b.kind==='server'&&m.cooling<m.heat)alerts.push({code:'ЖАР',message:'Перегрев: сервер теряет прочность'});
 if(b.kind==='defense'){const interference=defenseModifiers(s,b);if(interference.range<1)alerts.push({code:'РЭБ',message:'Помехи босса: дальность −30%'});if(interference.reload<1)alerts.push({code:'ИМП',message:'Импульс босса: скорость перезарядки −35%'});}
 if(b.kind==='defense'&&b.resupplyRequested)alerts.push({code:'БК →',message:(s.trucks??[]).some(t=>t.stops.includes(b.id))?'Пополнение в пути':'Заявка на пополнение в очереди'});
 return alerts;
}
const EDGES=['Северо-запад','Юго-восток','Северо-восток','Юго-запад'];
function regularEnemy(wave:number,remaining:number):Enemy['kind']{return wave===10&&remaining===1?'boss':wave>=5&&(remaining===10+wave*5-4||(wave>=8&&remaining===10+wave*5-12))?'pig':wave>=3&&remaining%4===0?'heavy':wave>=2&&remaining%3===0?'missile':'drone';}
export function waveIntel(s:State,wave:number){
 if(wave<1||wave>10)return null;
 const total=10+wave*5,edge=((s.sector??1)+wave-2)%4,counts={drone:0,missile:0,heavy:0,boss:0,pig:0};
 for(let remaining=total;remaining>0;remaining--)counts[regularEnemy(wave,remaining) as keyof typeof counts]++;
 return {wave,total,edge,direction:EDGES[edge],counts,boss:wave===10?bossInfo(s.sector):null,satellites:satelliteCount(wave),rare:!s.rareSpawned&&wave>=4&&wave<=9};
}
function updateSupply(s:State,dt:number){
 const trucks=s.trucks??=[];
 // A destroyed depot loses its vehicle; a rebuilt depot starts with a new one.
 s.trucks=trucks.filter(t=>s.buildings.some(b=>b.id===t.depot&&b.kind==='depot'&&b.hp>0));
 for(const t of [...s.trucks]){
  t.stops=t.stops.filter(id=>s.buildings.some(b=>b.id===id&&b.kind==='defense'&&b.hp>0));
  const target=s.buildings.find(b=>b.id===(t.stops[0]??t.depot));if(!target)continue;
  const waypoint=supplyLeg(s,t,target)[1];if(!waypoint)continue;
  const dx=waypoint.x-t.x,dy=waypoint.y-t.y,d=Math.hypot(dx,dy),travel=3*dt*conditions(s.sector).delivery*(s.perk==='delivery'?1.3:s.perk==='ammo'?.85:1);
  if(d<=travel&&(waypoint.x!==target.x||waypoint.y!==target.y)){t.x=waypoint.x;t.y=waypoint.y;continue;}
  if(d<=travel){t.x=target.x;t.y=target.y;if(t.stops.length){target.ammo=ammoCapacity(s);delete target.resupplyRequested;t.stops.shift();}else{s.trucks=s.trucks.filter(a=>a.id!==t.id);target.cooldown=1.5;}}
  else{t.x+=dx/d*travel;t.y+=dy/d*travel;}
 }
 const reserved=new Set(s.trucks.flatMap(t=>t.stops));
 for(const depot of s.buildings.filter(b=>b.kind==='depot'&&operational(b))){
  depot.cooldown=Math.max(0,depot.cooldown-dt);if(depot.cooldown>0||s.trucks.some(t=>t.depot===depot.id))continue;
  const targets=s.buildings.filter(b=>b.kind==='defense'&&b.hp>0&&((b.ammo??ammoCapacity(s))===0||b.resupplyRequested)&&!reserved.has(b.id)).sort((a,b)=>Number((b.ammo??ammoCapacity(s))===0)-Number((a.ammo??ammoCapacity(s))===0)||Math.hypot(a.x-depot.x,a.y-depot.y)-Math.hypot(b.x-depot.x,b.y-depot.y)).slice(0,2);
  if(targets.length){targets.forEach(b=>reserved.add(b.id));s.trucks.push({id:s.nextId++,depot:depot.id,x:depot.x,y:depot.y,stops:targets.map(b=>b.id)});}
 }
}

export function repair(s:State,id:number){const b=s.buildings.find(b=>b.id===id);if(!b||b.hp>=maxHp(b))return false;const amount=Math.min(maxHp(b)-b.hp,s.parts*5/repairPrice(s),s.money*5/repairPrice(s));if(amount<=0)return false;s.parts-=amount/5*repairPrice(s);s.money-=amount/5*repairPrice(s);b.hp+=amount;return true;}
export function research(s:State,t:Tech){const cost=2+s.tech[t]*2;if(s.tech[t]>=3||s.science<cost)return false;s.science-=cost;s.tech[t]++;log(s,`Исследование: ${TECHS[t].name}, уровень ${s.tech[t]}.`);return true;}
export function startWave(s:State,bonus:Bonus){if(s.phase!=='build'||s.wave>=10)return false;beginWave(s,bonus);return true;}
function beginWave(s:State,bonus:Bonus){s.wave++;s.waveEarnings=0;s.satelliteRemaining=satelliteCount(s.wave);s.satelliteWave=s.wave;s.satelliteAt=undefined;s.satelliteDone=false;s.phase='attack';s.bonus=bonus;s.remaining=10+s.wave*5;s.spawnIn=1;s.event=s.wave===10?`Финальная атака: ${bossInfo(s.sector).name}. ${bossInfo(s.sector).description}`:s.wave%3===0?'Авария внешней сети: выработка энергии −25%.':s.wave%2===0?'Обнаружены ракеты. Проверьте прикрытие инфраструктуры.':'БПЛА на подлёте. Комплексы переведены в боевой режим.';if(bonus==='budget'){s.buildings.forEach(b=>b.hp=Math.min(maxHp(b),b.hp+maxHp(b)*.25));s.money+=100;}if(s.wave===2)s.event+=' С волны 4 падают спутники: подготовьте 1000 ₽ на орбитальную ПВО или 300 ₽ на разовый перехват.';log(s,`Волна ${s.wave}. ${s.event}`);return true;}
function chooseTarget(s:State,kind:Enemy['kind'],random:()=>number){
 const alive=s.buildings.filter(b=>b.hp>0);
 const priorities:Kind[]=kind==='pig'?['depot','power','server']:kind==='missile'?['power','cooler']:kind==='heavy'?['defense','radar','depot','orbital']:['server'];
 const preferred=alive.filter(b=>priorities.includes(b.kind));
 const targets=preferred.length&&random()<.65?preferred:alive;
 return targets[Math.floor(random()*targets.length)];
}
function pigEntry(s:State,edge:number,random:number){
 const cells=mapCells(s.sector),free=cells.filter(p=>!occupied(s,p.x,p.y)),pool=free.length?free:cells;
 const axis=edge<2?'x':'y',sign=edge===0||edge===2?1:-1;
 const outer=Math.min(...pool.map(p=>p[axis]*sign)),border=pool.filter(p=>p[axis]*sign===outer);
 return border[Math.min(border.length-1,Math.floor(random*border.length))];
}
function updatePig(s:State,e:Enemy,dt:number){
 e.pigAttackLeft=Math.max(0,(e.pigAttackLeft??0)-dt);e.pigHitLeft=Math.max(0,(e.pigHitLeft??0)-dt);
 if((e.pigSpawnLeft??0)>0){e.pigSpawnLeft=Math.max(0,e.pigSpawnLeft!-dt);return;}
 let target=s.buildings.find(b=>b.id===e.target&&b.hp>0);
 if(!target){target=s.buildings.filter(b=>b.hp>0).sort((a,b)=>Math.hypot(e.x-a.x,e.y-a.y)-Math.hypot(e.x-b.x,e.y-b.y))[0];if(!target)return;e.target=target.id;}
 const distance=Math.hypot(e.x-target.x,e.y-target.y);e.launchIn=Math.max(0,(e.launchIn??1)-dt);
 if(distance<=2.6){
  if(e.launchIn<=0){s.enemies.push({id:s.nextId++,kind:'missile',summoned:true,x:e.x,y:e.y,hp:24,maxHp:24,speed:1.25,damage:e.damage,target:target.id});e.launchIn=3.8;e.pigAttackLeft=.9;}
  return;
 }
 const waypoint=supplyLeg(s,e,target)[1];if(!waypoint)return;
 const dx=waypoint.x-e.x,dy=waypoint.y-e.y,d=Math.hypot(dx,dy),travel=e.speed*dt;
 if(d<=travel){e.x=waypoint.x;e.y=waypoint.y;}else{e.x+=dx/d*travel;e.y+=dy/d*travel;}
}
function spawn(s:State,random:()=>number){
 const boss=s.wave===10&&s.remaining===1;const rare=!s.rareSpawned&&s.wave>=4&&s.wave<=9&&s.remaining===10+s.wave*5&&(s.wave===9||random()<.12);const kind:Enemy['kind']=boss?'boss':rare?'barrel':regularEnemy(s.wave,s.remaining);
 const profile=bossInfo(s.sector);const base={drone:[48,.70,55],missile:[34,1.12,80],heavy:[145,.43,120],boss:[profile.hp,profile.speed,650],barrel:[450,.85,105],pig:[220,.55,40]}[kind];const randomEdge=Math.floor(random()*4);const edge=(10+s.wave*5-s.remaining)%5<3?waveIntel(s,s.wave)!.edge:randomEdge;const p=random()*11;const target=chooseTarget(s,kind,random);if(!target)return;
 if(rare){s.rareSpawned=true;s.event='Редкая цель: Бочколёт! Бронированный самолёт запускает ракеты по инфраструктуре.';log(s,s.event);}
 const ground=kind==='pig'?pigEntry(s,edge,p/11):null;
 s.enemies.push({id:s.nextId++,kind,...(ground?{pigSpawnLeft:.8}:{}),...(boss?{bossType:bossType(s.sector)}:{}),x:ground?.x??(edge===0?-3:edge===1?15:p),y:ground?.y??(edge===2?-3:edge===3?15:p),hp:base[0]*(1+s.wave*.15),maxHp:base[0]*(1+s.wave*.15),speed:base[1]*(1+(s.wave-1)*.025),damage:base[2]*(1+(s.wave-1)*.04),target:target.id});s.remaining--;
}
export function resolveStarlink(s:State,disable:boolean){
 if(s.phase!=='attack'||s.wave!==3||s.starlink!=='pending')return false;
 s.starlink=disable?'disabled':'kept';
 if(disable){
  s.remaining=0;
  for(const e of s.enemies){
   const target=s.buildings.find(b=>b.id===e.target);
   const dx=e.x-(target?.x??SIZE/2),dy=e.y-(target?.y??SIZE/2),distance=Math.hypot(dx,dy);
   e.retreat=distance>.001?{x:dx/distance,y:dy/distance}:{x:0,y:-1};
  }
  s.event='Starlink отключён. Дроны и ракеты возвращаются назад.';
 }else s.event='Starlink остаётся включён. Продолжайте оборону.';
 log(s,s.event);return true;
}
export function defenseModifiers(s:State,b:Building){
 let range=1,reload=1;
 for(const e of s.enemies)if(e.kind==='boss'&&e.hp>0&&!e.retreat&&Math.hypot(e.x-b.x,e.y-b.y)<=5){const type=e.bossType??bossType(s.sector);if(type==='jammer')range=.7;if(type==='frost')reload=.65;}
 return {range,reload};
}
export function defenseRange(s:State,b:Building){const radar=Math.max(0,...s.buildings.filter(a=>a.kind==='radar'&&operational(a)).map(a=>a.level));return (4.5+b.level*.5)*(1+radar*.3*metrics(s).supply)*defenseModifiers(s,b).range;}
function hitEnemy(s:State,e:Enemy,damage:number,gun:Building){if(e.kind==='pig')e.pigHitLeft=.4;e.hp-=damage*(e.kind==='boss'&&(e.bossType??bossType(s.sector))==='siege'&&gun.specialization!=='rocket'?.75:1);}
export function setPriority(s:State,id:number,priority:Priority){const b=s.buildings.find(b=>b.id===id);if(!b||b.kind!=='defense'||!['nearest','missile','heavy'].includes(priority)||!['build','attack'].includes(s.phase))return false;b.priority=priority;return true;}
export function upgradeForecast(s:State,id:number){
 const b=s.buildings.find(b=>b.id===id);if(!b)return '';
 const future=metrics({...s,buildings:s.buildings.map(a=>a.id===id?{...a,upgradeLeft:UPGRADE_SECONDS}:a)});
 const warnings=[`Отключение на ${UPGRADE_SECONDS} с.`];
 if(future.supply<=.1)warnings.push('ПВО остановится: нет питания.');else if(future.power<future.demand)warnings.push(`Дефицит энергии: ${Math.ceil(future.demand-future.power)} МВт. ПВО замедлится.`);
 if(future.cooling<future.heat)warnings.push('Недостаток охлаждения: серверы будут получать урон.');
 if(future.efficiency<=.85)warnings.push('Репутация будет снижаться.');
 if(b.kind==='defense')warnings.push('Эта установка временно не стреляет.');
 if(b.kind==='server')warnings.push('Этот сервер временно не приносит доход.');
 return warnings.join(' ');
}
export const EMERGENCY_COST=300;
export function emergencyIntercept(s:State){
 const a=s.satellite;if(s.phase!=='attack'||!a||a.interceptor||s.emergencyWave===s.wave||s.money<EMERGENCY_COST)return false;
 s.money-=EMERGENCY_COST;s.emergencyWave=s.wave;a.interceptor={x:a.x,y:a.y,progress:0};
 log(s,'Вызван аварийный перехват за 300 ₽. Повторный вызов доступен в следующей волне.');return true;
}
function damageBuilding(s:State,b:Building,amount:number,cause:string){
 b.hp-=amount;
 const gun=s.buildings.filter(a=>a.kind==='defense'&&a.hp>0).sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];
 const status=!gun?'ПВО на площадке отсутствовало.':gun.upgradeLeft?'Ближайшее ПВО было на улучшении.':(gun.ammo??AMMO_CAPACITY)===0?'Ближайшее ПВО было без боеприпасов.':metrics(s).supply<=.1?'ПВО было без питания.':'Проверьте дальность и приоритеты ПВО.';
 b.lastDamage=`${TYPES[b.kind].name} №${b.id}: ${cause}. ${status}`;
}
export function tick(s:State,dt:number,random:()=>number=Math.random){
 if(s.phase==='lost'||s.phase==='won'||s.starlink==='pending')return;if(s.phase==='build'&&s.wave>0&&s.wave<10)beginWave(s,s.bonus);s.elapsed+=dt;updateUpgrades(s,dt);const m=metrics(s);const earned=Math.min(m.income*dt,m.incomeRemaining);s.money+=earned;if(s.phase==='attack')s.waveEarnings=Math.min(m.incomeLimit,(s.waveEarnings??0)+earned);s.reputation=Math.max(0,Math.min(100,s.reputation+(m.efficiency>.85?.15:-1.5)*dt));
 for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
 for(const b of s.buildings){
  if(!operational(b))continue;
  if(b.kind==='server'&&m.cooling<m.heat)damageBuilding(s,b,dt*3*(1-m.cooling/Math.max(1,m.heat)),'перегрев из-за недостатка охлаждения');
  if((b.kind==='repair'||s.tech.automation>0)&&m.supply>.2){const target=s.buildings.find(a=>a.hp<maxHp(a)-.1);if(target&&s.parts>0){const rate=b.kind==='repair'?4*b.level:2*s.tech.automation/s.buildings.length;const amount=Math.min(maxHp(target)-target.hp,rate*dt*m.supply,s.parts*8/repairPrice(s));target.hp+=amount;s.parts-=amount/8*repairPrice(s);}}
  if(b.kind==='orbital')b.cooldown=Math.max(0,b.cooldown-dt);
  if(b.kind==='defense'){b.cooldown-=dt*defenseModifiers(s,b).reload;const range=defenseRange(s,b);const target=s.enemies.filter(e=>e.hp>0&&!e.retreat&&Math.hypot(e.x-b.x,e.y-b.y)<range).sort((a,c)=>{const rank=(e:Enemy)=>b.priority==='missile'?(e.kind==='missile'?0:1):b.priority==='heavy'?(['heavy','boss','barrel','pig'].includes(e.kind)?0:1):0;return rank(a)-rank(c)||Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y);})[0];if(target&&b.cooldown<=0&&m.supply>.1&&(b.ammo??AMMO_CAPACITY)>0){b.ammo=(b.ammo??AMMO_CAPACITY)-1;const damage=23*b.level*(1+s.tech.security*.25)*(s.bonus==='shield'?1.35:1);hitEnemy(s,target,damage*(b.specialization==='flak'?.7:b.specialization==='rocket'?(['heavy','boss','barrel','pig'].includes(target.kind)?2.2:1.3):1),b);if(b.specialization==='flak')for(const other of s.enemies)if(other.id!==target.id&&other.hp>0&&!other.retreat&&Math.hypot(other.x-target.x,other.y-target.y)<=1.3)hitEnemy(s,other,damage*.45,b);b.cooldown=(b.specialization==='rocket'?1.5:.85)/Math.max(.15,m.supply);s.effects.push({x:b.x,y:b.y,tx:target.x,ty:target.y,kind:'shot',life:.18});}}
 }
 if(s.phase==='attack'){
  s.spawnIn-=dt;if(!s.satellite&&s.remaining>0&&s.spawnIn<=0){const groupSize=s.wave>=7?4:s.wave>=4?3:2;for(let i=0;i<groupSize&&s.remaining>0;i++)spawn(s,random);s.spawnIn=Math.max(1.8,2.8-s.wave*.1);}
  if(s.wave===3&&!s.starlink&&s.remaining<=Math.floor((10+s.wave*5)/2)){s.starlink='pending';return;}
  for(const e of s.enemies){if(e.retreat){e.x+=e.retreat.x*3*dt;e.y+=e.retreat.y*3*dt;if(e.x< -4||e.x>SIZE+4||e.y< -4||e.y>SIZE+4)e.hp=0;continue;}if(e.hp<=0){s.kills++;s.money+=e.summoned?0:e.kind==='barrel'?60:4;s.effects.push({x:e.x,y:e.y,tx:e.x,ty:e.y,life:.55,kind:'blast'});continue;}
   if(e.kind==='pig'){updatePig(s,e,dt);continue;}
   if(e.kind==='barrel'){
    e.launchIn=(e.launchIn??2)-dt;
    if(e.launchIn<=0){
     const aim=chooseTarget(s,'missile',random);
     if(aim)s.enemies.push({id:s.nextId++,kind:'missile',summoned:true,x:e.x,y:e.y,hp:24,maxHp:24,speed:1.6,damage:45*(1+s.wave*.03),target:aim.id});
     e.launchIn=3.5;
    }
   }
   if(e.kind==='boss'){
    const type=e.bossType??bossType(s.sector);
    if(type==='repair')e.hp=Math.min(e.maxHp,e.hp+12*dt);
    if(type==='siege'){e.abilityIn=(e.abilityIn??3)-dt;if(e.abilityIn<=0){for(let i=0;i<2;i++){const aim=chooseTarget(s,'missile',random);if(aim)s.enemies.push({id:s.nextId++,kind:'missile',summoned:true,x:e.x+(i-.5)*.4,y:e.y,hp:30,maxHp:30,speed:1.4,damage:45,target:aim.id});}e.abilityIn=6;}}
    e.launchIn=(e.launchIn??2.5)-dt;
    if(e.launchIn<=0){
     const count=Math.min(type==='carrier'?3:2,12-s.enemies.filter(a=>a.mini&&a.hp>0).length);
     for(let i=0;i<count;i++){const aim=chooseTarget(s,'drone',random);if(!aim)break;const angle=i*Math.PI*2/3;s.enemies.push({id:s.nextId++,kind:'drone',mini:true,summoned:true,x:e.x+Math.cos(angle)*.35,y:e.y+Math.sin(angle)*.35,hp:36,maxHp:36,speed:1.25,damage:28,target:aim.id});}
     e.launchIn=type==='carrier'?5:7;
    }
   }
   let target=s.buildings.find(b=>b.id===e.target&&b.hp>0);if(!target){target=chooseTarget(s,e.kind,random);if(!target)continue;e.target=target.id;}const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy);if(d<.22){damageBuilding(s,target,e.damage,({drone:'попадание дрона',missile:'попадание ракеты',heavy:'попадание тяжёлого дрона',boss:'удар босса',barrel:'удар бочколёта'})[e.kind]);if(e.kind==='heavy'||e.kind==='boss'){const radius=e.kind==='boss'?2.5:1.5;for(const nearby of s.buildings)if(nearby.id!==target.id&&Math.hypot(nearby.x-target.x,nearby.y-target.y)<=radius)damageBuilding(s,nearby,e.damage*.25,'взрыв рядом со зданием');}e.hp=-999;s.effects.push({x:target.x,y:target.y,tx:target.x,ty:target.y,life:.65,kind:'blast'});}else{e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;}}
  s.enemies=s.enemies.filter(e=>e.hp>0);
 }
 const dead=s.buildings.filter(b=>b.hp<=0);for(const b of dead)log(s,`${TYPES[b.kind].short} потеряна.`);s.buildings=s.buildings.filter(b=>b.hp>0);
 if(!s.buildings.some(b=>b.kind==='server')||s.reputation<=0){s.phase='lost';s.defeatReason=s.reputation<=0?'Репутация упала до нуля из-за низкой эффективности. Обеспечьте запас энергии и охлаждения.':dead.find(b=>b.kind==='server')?.lastDamage??'Все серверные корпуса уничтожены.';log(s,'Работа площадки остановлена.');return;}
 if(s.phase==='attack'){
  // Initialize quotas for older saves as well as newly started waves.
  if(s.satelliteWave!==s.wave){s.satelliteWave=s.wave;s.satelliteRemaining=Math.max(0,satelliteCount(s.wave)-(s.satellite?1:0));s.satelliteAt=undefined;}
  if(s.satelliteAt===undefined)s.satelliteAt=s.elapsed+2;
  if(s.satellite){
   const falling=s.satellite;
   falling.progress=Math.min(SATELLITE_FLIGHT,falling.progress+dt);
   if(falling.interceptor){
    falling.interceptor.progress+=dt;
    if(falling.interceptor.progress>=1){
     const ease=Math.pow(falling.progress/SATELLITE_FLIGHT,1.5),target=s.buildings.find(b=>b.id===falling.target);
     s.effects.push({x:falling.x,y:falling.y,tx:-280*(1-ease),ty:-50-(target?.level??1)*6-480*(1-ease),life:.8,kind:'intercept'});
     s.satellite=undefined;s.event='Спутник сбит орбитальным перехватчиком. Сервер защищён.';log(s,s.event);
    }
   }else if(falling.progress>=.5&&m.supply>.25){
    const launcher=s.buildings.find(b=>b.kind==='orbital'&&operational(b)&&b.cooldown<=0);
    if(launcher){falling.interceptor={x:launcher.x,y:launcher.y,progress:0};launcher.cooldown=3.5;}
   }
   if(s.satellite&&falling.progress>=SATELLITE_FLIGHT){
    const target=s.buildings.find(b=>b.id===falling.target);
    if(target){damageBuilding(s,target,target.hp,'прямое попадание спутника');s.defeatReason=target.lastDamage+' Нужна работающая орбитальная ПВО или аварийный перехват.';log(s,'Прямое попадание спутника: серверный корпус полностью уничтожен.');}
    s.effects.push({x:falling.x,y:falling.y,tx:falling.x,ty:falling.y,life:.65,kind:'blast'});
    s.satellite=undefined;s.event='Спутник уничтожил серверный корпус. Восстановите инфраструктуру.';
    s.buildings=s.buildings.filter(b=>b.hp>0);
    if(!s.buildings.some(b=>b.kind==='server')){s.phase='lost';log(s,'Работа площадки остановлена.');return;}
   }
   if(!s.satellite)s.satelliteAt=s.elapsed+1.2;
  }else if((s.satelliteRemaining??0)>0&&s.remaining===0&&s.enemies.length===0&&s.elapsed>=s.satelliteAt){
   const servers=s.buildings.filter(b=>b.kind==='server');const target=servers[Math.floor(random()*servers.length)];
   if(target){s.satellite={target:target.id,x:target.x,y:target.y,progress:0};s.satelliteRemaining!--;s.event='Внимание: спутник сходит с орбиты прямо над серверной!';log(s,s.event);}
  }
 }
 updateSupply(s,dt);
 if(s.phase==='attack'&&!s.satellite&&(s.satelliteRemaining??0)===0&&s.remaining===0&&s.enemies.length===0){s.money+=180+s.wave*35;s.parts+=30;s.science+=2;log(s,`Волна ${s.wave} отражена. +${180+s.wave*35} ₽, +30 запчастей, +2 очка науки.`);if(s.wave===10){s.phase='won';s.event='Все десять волн отражены. Периметр чист.';}else{beginWave(s,s.bonus);s.spawnIn=0;}}
}
export const SAVE_KEY='data-fortress-v1';
export function encode(s:State){return JSON.stringify({...s,effects:[]});}
export function decode(raw:string):State|null {try{const s=JSON.parse(raw) as State;if(s.version!==1||!Array.isArray(s.buildings)||!Array.isArray(s.enemies)||!Array.isArray(s.log)||!s.tech||!['build','attack','won','lost'].includes(s.phase)||!['shield','reserve','budget'].includes(s.bonus))return null;for(const key of ['money','parts','science','wave','remaining','elapsed','reputation','kills','nextId'] as const)if(!Number.isFinite(s[key])||s[key]<0)return null;if(!Number.isFinite(s.spawnIn)||s.wave>10||s.buildings.length>SIZE*SIZE)return null;if(s.starlink!==undefined&&!['pending','disabled','kept'].includes(s.starlink))return null;if(s.starlink==='pending'&&(s.wave!==3||s.phase!=='attack'))return null;if(s.waveEarnings!==undefined&&(!Number.isFinite(s.waveEarnings)||s.waveEarnings<0||s.waveEarnings>waveIncomeLimit(s.wave)))return null;if(s.rareSpawned!==undefined&&typeof s.rareSpawned!=='boolean')return null;if(s.satelliteAt!==undefined&&(!Number.isFinite(s.satelliteAt)||s.satelliteAt<0))return null;if(s.satelliteDone!==undefined&&typeof s.satelliteDone!=='boolean')return null;if(s.satellite){const a=s.satellite;if(![a.target,a.x,a.y,a.progress].every(Number.isFinite)||a.x<0||a.x>=SIZE||a.y<0||a.y>=SIZE||a.progress<0||a.progress>SATELLITE_FLIGHT||s.phase!=='attack')return null;}if(s.satelliteRemaining!==undefined&&(!Number.isInteger(s.satelliteRemaining)||s.satelliteRemaining<0||s.satelliteRemaining>10))return null;
 if(s.satelliteWave!==undefined&&(!Number.isInteger(s.satelliteWave)||s.satelliteWave<0||s.satelliteWave>10))return null;
 if(s.satelliteWave===s.wave&&(s.satelliteRemaining??0)>satelliteCount(s.wave))return null;
 if(s.satellite?.interceptor){const r=s.satellite.interceptor;if(![r.x,r.y,r.progress].every(Number.isFinite)||r.x<0||r.x>=SIZE||r.y<0||r.y>=SIZE||r.progress<0||r.progress>1)return null;}
 s.sector??=1;if(!Number.isSafeInteger(s.sector)||s.sector<1)return null;
 if(s.entryReward!==undefined&&(!Number.isSafeInteger(s.entryReward)||s.entryReward<1||s.entryReward>=s.sector))return null;
 if(s.satelliteWarningDismissed!==undefined&&typeof s.satelliteWarningDismissed!=='boolean')return null;
 if(s.perk!==undefined&&!Object.hasOwn(PERKS,s.perk))return null;if(s.emergencyWave!==undefined&&(!Number.isInteger(s.emergencyWave)||s.emergencyWave<1||s.emergencyWave>s.wave))return null;if(s.defeatReason!==undefined&&typeof s.defeatReason!=='string')return null;
 const cells=new Set();for(const b of s.buildings){if(!TYPES[b.kind]||![b.x,b.y,b.hp,b.id,b.level,b.cooldown].every(Number.isFinite)||b.x<0||b.y<0||b.x>=SIZE||b.y>=SIZE||!Number.isInteger(b.x)||!Number.isInteger(b.y)||b.level<1||b.level>maxLevel(b)||b.hp<=0||!buildable(s.sector,b.x,b.y)||cells.has(`${b.x},${b.y}`))return null;if(b.specialization!==undefined&&(b.kind!=='defense'||b.level<2||!['flak','rocket'].includes(b.specialization)))return null;if(b.pendingSpecialization!==undefined&&(b.kind!=='defense'||!b.upgradeLeft||b.specialization||!['flak','rocket'].includes(b.pendingSpecialization)))return null;if(b.priority!==undefined&&(b.kind!=='defense'||!['nearest','missile','heavy'].includes(b.priority)))return null;if(b.resupplyRequested!==undefined&&(typeof b.resupplyRequested!=='boolean'||b.kind!=='defense'))return null;if(b.lastDamage!==undefined&&typeof b.lastDamage!=='string')return null;if(b.ammo!==undefined&&(!Number.isInteger(b.ammo)||b.ammo<0||b.ammo>ammoCapacity(s)))return null;if(b.upgradeLeft!==undefined&&(!Number.isFinite(b.upgradeLeft)||b.upgradeLeft<0||b.upgradeLeft>UPGRADE_SECONDS||(b.upgradeLeft>0&&(b.level>=maxLevel(b)))))return null;if(b.kind==='depot'&&b.level!==1)return null;if(b.kind==='defense'&&b.ammo===undefined)b.ammo=ammoCapacity(s);if(b.refundable!==undefined&&typeof b.refundable!=='boolean')return null;if(b.refundable===undefined&&s.wave===0&&b.id>4)b.refundable=true;cells.add(`${b.x},${b.y}`);}for(const t of Object.keys(TECHS) as Tech[])if(!Number.isInteger(s.tech[t])||s.tech[t]<0||s.tech[t]>3)return null;for(const e of s.enemies)if(!['drone','missile','heavy','boss','barrel','pig'].includes(e.kind)||![e.x,e.y,e.hp,e.maxHp,e.speed,e.damage,e.target,e.id].every(Number.isFinite))return null;for(const e of s.enemies){for(const key of ['pigAttackLeft','pigHitLeft','pigSpawnLeft'] as const)if(e[key]!==undefined&&(e.kind!=='pig'||!Number.isFinite(e[key])||e[key]!<0||e[key]!>1))return null;if(e.kind==='pig'&&!buildable(s.sector,Math.round(e.x),Math.round(e.y)))return null;if(e.bossType!==undefined&&(e.kind!=='boss'||!Object.hasOwn(BOSSES,e.bossType)))return null;if(e.abilityIn!==undefined&&(e.kind!=='boss'||!Number.isFinite(e.abilityIn)||e.abilityIn<0||e.abilityIn>6))return null;if(e.summoned!==undefined&&typeof e.summoned!=='boolean')return null;if(e.mini&&e.summoned===undefined)e.summoned=true;if(e.mini!==undefined&&(typeof e.mini!=='boolean'||e.kind!=='drone'))return null;if(e.launchIn!==undefined&&(!Number.isFinite(e.launchIn)||!['boss','barrel','pig'].includes(e.kind)))return null;}for(const e of s.enemies)if(e.retreat&&(!Number.isFinite(e.retreat.x)||!Number.isFinite(e.retreat.y)||Math.abs(Math.hypot(e.retreat.x,e.retreat.y)-1)>.001))return null;if(s.buildings.filter(b=>b.kind==='orbital').length>1)return null;if(s.buildings.filter(b=>b.kind==='depot').length>2)return null;
 if(s.trucks!==undefined&&!Array.isArray(s.trucks))return null;s.trucks??=[];if(s.trucks.length>2)return null;
 const depots=new Set<number>(),stops=new Set<number>();for(const t of s.trucks){if(![t.id,t.depot,t.x,t.y].every(Number.isFinite)||!Array.isArray(t.stops)||t.stops.length>2||t.stops.some(id=>!Number.isInteger(id)||stops.has(id))||new Set(t.stops).size!==t.stops.length||depots.has(t.depot)||t.x<0||t.y<0||t.x>=SIZE||t.y>=SIZE)return null;depots.add(t.depot);t.stops.forEach(id=>stops.add(id));}
 s.effects=[];return s;}catch{return null;}}
