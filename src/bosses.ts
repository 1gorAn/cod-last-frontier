import {location} from './maps.ts';
export const BOSSES={
 carrier:{name:'Лесной улей',description:'Носитель выпускает по 3 минидрона каждые 5 с.',counter:'Зенитная ПВО против роя; ракетная — против носителя.',hp:1400,speed:.27,color:0xe8b96a},
 siege:{name:'Бастион',description:'Броня поглощает 25% урона, кроме ракетной специализации. Каждые 6 с запускает 2 ракеты.',counter:'Ракетная специализация пробивает броню. Часть ПВО направьте на ракеты.',hp:1600,speed:.23,color:0xe99567},
 jammer:{name:'Глушитель',description:'В радиусе 5 клеток снижает дальность ПВО на 30%.',counter:'Радар компенсирует помехи. Используйте приоритет тяжёлых целей.',hp:1100,speed:.29,color:0xc1a0ef},
 frost:{name:'Полярный импульс',description:'В радиусе 5 клеток снижает скорость перезарядки ПВО на 35%.',counter:'Распределите ПВО и атакуйте с дистанции при поддержке радара.',hp:1250,speed:.25,color:0x80d8ee},
 repair:{name:'Регенератор',description:'Восстанавливает 12 HP в секунду, пока жив.',counter:'Сосредоточьте огонь ракетных ПВО: приоритет тяжёлых целей.',hp:1350,speed:.26,color:0x91d39a},
} as const;
export type BossType=keyof typeof BOSSES;
export function bossType(sector=1):BossType {const theme=location(sector).theme;return theme==='forest'?'carrier':theme==='canyon'?'siege':theme==='islands'?'jammer':theme==='snow'?'frost':'repair';}
export const bossInfo=(sector=1)=>BOSSES[bossType(sector)];
