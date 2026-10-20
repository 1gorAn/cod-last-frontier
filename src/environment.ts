import {buildable,location} from './maps.ts';
export const terrainNoise=(x:number,y:number,seed:number)=>{const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);};
export function habitat(sector:number,x:number,y:number):'site'|'water'|'land'{
 if(buildable(sector,x,y))return 'site';
 const theme=location(sector).theme;
 if(theme==='islands'){
  const islet=[[-3,3],[14,7],[5,-4],[10,15]].some(([cx,cy])=>((x-cx)/1.8)**2+((y-cy)/2.4)**2<1);
  return islet?'land':'water';
 }
 if(theme==='canyon')return Math.abs(y-5.5-Math.sin(x*.55)*.6)<1.3?'water':'land';
 if(theme==='snow')return Math.abs(x+2-Math.sin(y*.45)*1.1)<1?'water':'land';
 if(theme==='ruins')return ((x+1)/2.2)**2+((y-8)/3.3)**2<1||((x-13)/2)**2+((y-3)/2.8)**2<1?'water':'land';
 return Math.abs(x+2.5-Math.sin(y*.4)*1.5)<1||((x-11)/1.6)**2+((y-0)/1.3)**2<1?'water':'land';
}
