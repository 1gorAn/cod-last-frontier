import {fresh,nextSector,decode,encode,SAVE_KEY,tick,type State,type Kind,type Perk} from './model.ts';
let saved:State|null=null;try{saved=decode(localStorage.getItem(SAVE_KEY)||'');}catch{/* Storage may be unavailable. */}
export const session={state:saved||fresh(),selected:0,placing:null as Kind|null,paused:false,modalOpen:false,speed:1,saved:!!saved,saveError:false,notice:'',revision:0};
let saveTimer=0;
export function save(){try{localStorage.setItem(SAVE_KEY,encode(session.state));session.saveError=false;session.saved=true;}catch{session.saveError=true;}}
export function step(dt:number){if(!session.paused&&!session.modalOpen)tick(session.state,dt*session.speed);saveTimer+=dt;if(saveTimer>5){save();saveTimer=0;}}
export function reset(){session.state=fresh(session.state.sector,session.state.perk,session.state.entryReward);session.selected=0;session.placing=null;session.paused=false;session.speed=1;save();}
export function notify(text:string){session.notice=text;setTimeout(()=>{if(session.notice===text)session.notice='';},3200);}

export function advance(perk:Perk,destination?:number){const next=nextSector(session.state,perk,destination);if(!next)return;session.state=next;session.selected=0;session.placing=null;session.paused=false;session.speed=1;save();}

export function togglePause(){if(session.modalOpen||['won','lost'].includes(session.state.phase))return;session.paused=!session.paused;}
