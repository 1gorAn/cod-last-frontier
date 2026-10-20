export const LOCATIONS = [
 {name:'Сосновый бор',theme:'forest',description:'Просторная площадка для первой линии обороны.',ground:0x748372,blocked:0x345346},
 {name:'Заросший периметр',theme:'forest',description:'Лес отвоевал края площадки. Строить можно только на расчищенных клетках.',ground:0x788777,blocked:0x294d3c},
 {name:'Красный каньон',theme:'canyon',description:'Две широкие площадки соединены узкой перемычкой. Учитывайте путь снабжения.',ground:0xb09272,blocked:0x674a3d},
 {name:'Островной узел',theme:'islands',description:'Вода разделяет площадку. Машины снабжения движутся через сухопутную перемычку.',ground:0x91a58b,blocked:0x346c80},
 {name:'Полярная станция',theme:'snow',description:'Лёд перекрыл углы карты. Компактная оборона на ромбовидной площадке.',ground:0xb3c9cd,blocked:0x607f91},
 {name:'Старый комплекс',theme:'ruins',description:'Завалы внутри площадки мешают застройке и удлиняют доставку боекомплектов.',ground:0x91958b,blocked:0x4d5557},
] as const;
export const location=(sector=1)=>LOCATIONS[sector===1?0:1+(sector-2)%5];
export function buildable(sector:number|undefined,x:number,y:number):boolean {
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=12||y>=12)return false;
 if((sector??1)===1)return true;
 const theme=location(sector).theme;
 if(x<1||y<1||x>10||y>10)return false;
 if(theme==='forest')return !((x<3||x>8)&&(y<3||y>8));
 if(theme==='canyon')return y<=3||y>=8||(x>=4&&x<=7);
 if(theme==='islands')return x<=4||x>=7||(y>=4&&y<=6);
 if(theme==='snow')return Math.abs(x-5.5)+Math.abs(y-5.5)<=6;
 return !((x===3||x===8)&&(y===3||y===4||y===7||y===8));
}
export function mapCells(sector=1){return Array.from({length:144},(_,i)=>({x:i%12,y:Math.floor(i/12)})).filter(p=>buildable(sector,p.x,p.y));}
// Buildings are accessible delivery destinations. Only terrain blocks vehicle travel.
export function terrainPath(sector:number|undefined,from:{x:number;y:number},to:{x:number;y:number}) {
 const start={x:Math.round(from.x),y:Math.round(from.y)},queue=[start],parents=new Map<string,{x:number;y:number}|null>([[`${start.x},${start.y}`,null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p.x===to.x&&p.y===to.y){const path=[p];let prev=parents.get(`${p.x},${p.y}`);while(prev){path.unshift(prev);prev=parents.get(`${prev.x},${prev.y}`);}return path;}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,y:p.y+dy},key=`${n.x},${n.y}`;if(buildable(sector,n.x,n.y)&&!parents.has(key)){parents.set(key,p);queue.push(n);}}
 }
 return [];
}

export function conditions(sector=1){
 const theme=location(sector).theme;
 if(sector===1)return {cooling:1,power:1,delivery:1,repair:1,label:'Стандартные условия'};
 if(theme==='forest')return {cooling:1.15,power:1,delivery:.9,repair:1,label:'Охлаждение +15% · доставка −10%'};
 if(theme==='canyon')return {cooling:.9,power:1.15,delivery:1,repair:1,label:'Выработка энергии +15% · охлаждение −10%'};
 if(theme==='islands')return {cooling:1.2,power:.9,delivery:1,repair:1,label:'Охлаждение +20% · выработка энергии −10%'};
 if(theme==='snow')return {cooling:1.3,power:1,delivery:.8,repair:1,label:'Охлаждение +30% · доставка −20%'};
 return {cooling:1,power:.9,delivery:1,repair:.75,label:'Ремонт дешевле на 25% · выработка энергии −10%'};
}

export const routeChoices=(sector=1)=>[sector+1,sector+2];
// Victory supplies equip the next base once; they never accumulate between operations.
export function victoryReward(sector=1){
 const theme=location(sector).theme;
 if(theme==='forest')return {money:100,parts:0,science:0,label:'+100 ₽ к бюджету следующей базы'};
 if(theme==='canyon')return {money:0,parts:30,science:0,label:'+30 запчастей следующей базе'};
 if(theme==='islands')return {money:0,parts:0,science:2,label:'+2 науки следующей базе'};
 if(theme==='snow')return {money:0,parts:40,science:0,label:'+40 запчастей следующей базе'};
 return {money:150,parts:0,science:0,label:'+150 ₽ к бюджету следующей базы'};
}
