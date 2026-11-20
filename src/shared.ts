export const ACTIONS = [
  {id:'bow',name:'Lạy Phật',icon:'♧',zone:'hall',hint:'Một lần cúi mình, một chút an yên.'},
  {id:'incense',name:'Thắp hương',icon:'♨',zone:'offering',hint:'Gửi một tâm nguyện lành.'},
  {id:'flower',name:'Dâng hoa',icon:'❀',zone:'offering',hint:'Một đóa sen, một lòng thành.'},
  {id:'chant',name:'Tụng kinh',icon:'☷',zone:'hall',hint:'Lắng lòng theo từng lời kinh.'},
  {id:'beads',name:'Tràng hạt',icon:'◌',zone:'garden',hint:'Chậm lại cùng từng hạt nhỏ.'},
  {id:'bell',name:'Gõ chuông',icon:'♧',zone:'bell',hint:'Một tiếng chuông ngân, một lòng tĩnh lặng.'},
  {id:'wood',name:'Gõ mõ',icon:'♬',zone:'hall',hint:'Một tiếng mõ, trở về hiện tại.'},
  {id:'lantern',name:'Thả đèn',icon:'🏮',zone:'lantern',hint:'Một chiếc đèn nhỏ, gửi lời nguyện an lành lên trời.'},
  {id:'meditate',name:'Ngồi thiền',icon:'☼',zone:'garden',hint:'Thả lỏng vai. Nhẹ nhàng hít thở.'},
] as const;
export type ActionId = typeof ACTIONS[number]['id'] | 'idle';
export const OUTFITS = [
  {id:'lam',name:'Áo lam',detail:'Gọn nhẹ · quần suông'},
  {id:'trang',name:'Áo tràng',detail:'Thanh nhã · tà áo dài'},
  {id:'cheo',name:'Áo vạt chéo',detail:'Ấm áp · dải áo vàng'},
] as const;
export type OutfitId = typeof OUTFITS[number]['id'];
export type ChatView = {id:string;senderId:string;name:string;text:string;sentAt:number};
export type PlayerView = {id:string;name:string;color:string;outfit:OutfitId;x:number;z:number;yaw:number;action:ActionId;startedAt:number;duration:number;seat:number;connected:boolean};
export type OfferingView = {id:string;kind:string;color:string;expiresAt:number};
export type LanternView={id:string;ownerId:string;x:number;z:number;color:string;releasedAt:number;expiresAt:number};
export type WorldView = {players:PlayerView[];offerings:OfferingView[];messages:ChatView[];lanterns:LanternView[]};
export const LANTERN_COLORS=['#ef582c','#ffc15c','#ec789a'];
export const LANTERN_LIMIT=24, LANTERN_LIFETIME=60000;
export const COLORS = ['#819a90','#b7a4bf','#c1a477','#7295ab'];
export const SEATS = [-4,-2,0,2,4].map(x=>({x,z:-9}));
export const WOOD_PERIOD_MS=850;
export const MEDITATION_SEATS=Array.from({length:5},(_,i)=>{
  const angle=i*Math.PI*2/5;
  return {x:10+Math.cos(angle)*2,z:3+Math.sin(angle)*2,yaw:Math.atan2(Math.cos(angle),Math.sin(angle))};
});
export const MAP_BOUNDS={minX:-30,maxX:30,minZ:-10,maxZ:42} as const;
export const ZONES:Record<string,{x:number;z:number;label:string}> = {
  hall:{x:0,z:-7,label:'Chính điện'},offering:{x:0,z:1.25,label:'Sân hương'},garden:{x:10,z:3,label:'Góc thiền'},
  lantern:{x:17,z:13,label:'Sân đèn lồng'},
  waterfall:{x:-18.5,z:11,label:'Hồ thác nước'},bell:{x:-22,z:-2.7,label:'Lầu chuông'},pavilion:{x:22,z:8,label:'Chòi An Lạc'},bamboo:{x:22,z:-6,label:'Rừng trúc'},
};
export const inHall=(x:number,z:number)=>Math.abs(x)<10.4&&z<-4.5;
export const groundHeight=(x:number,z:number)=>Math.abs(x)<11.5&&z<-4.5?.86:0;
export const walkable = (x:number,z:number) => {
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<MAP_BOUNDS.minX||x>MAP_BOUNDS.maxX||z<MAP_BOUNDS.minZ||z>MAP_BOUNDS.maxZ)return false;
  if(z>17 && (Math.hypot(x+17,z-29)<4.8 || (Math.abs(Math.abs(x)-8)<.55 && [22,29,36].some(row=>Math.abs(z-row)<.55))))return false;
  // Pond shores and hall walls, shared by the renderer and authoritative server.
  if(((x+10)/5.1)**2+((z-5)/4.5)**2<1)return false;
  if(((x+24)/4.8)**2+((z-4)/4)**2<1)return false;
  if(x>-28&&x<-22.2&&z>-2.5&&z<.8)return false;
  if(Math.abs(x)>10.1&&Math.abs(x)<10.9&&z<-5.2)return false;
  if(z<-8&&z>-12&&Math.abs(Math.abs(x)-15)<2.2)return false;
  return true;
};
export const actionZone = (id:string) => ACTIONS.find(a=>a.id===id)?.zone;

export const BELL_STATION={x:-22,z:-3.65,yaw:0,duration:2200,impact:650};
export const actionRadius=(id:string)=>id==='bell'?3:id==='lantern'?2.4:6;
