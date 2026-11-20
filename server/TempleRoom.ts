import { Room, type Client } from '@colyseus/core';
import { schema, t, type SchemaType } from '@colyseus/schema';
import { ACTIONS, LANTERN_COLORS, LANTERN_LIMIT, LANTERN_LIFETIME, MEDITATION_SEATS, BELL_STATION, actionRadius, COLORS, OUTFITS, SEATS, ZONES, walkable } from '../src/shared.ts';
export const Pilgrim=schema({name:t.string().default('Khách'),color:t.string().default(COLORS[0]),outfit:t.string().default('lam'),x:t.number().default(0),z:t.number().default(13),yaw:t.number().default(0),action:t.string().default('idle'),startedAt:t.number().default(0),duration:t.number().default(0),seat:t.number().default(-1),connected:t.boolean().default(true)},'Pilgrim');
export type Pilgrim=SchemaType<typeof Pilgrim>;
const Offering=schema({kind:t.string().default('incense'),color:t.string().default('#dda3aa'),expiresAt:t.number().default(0)},'Offering');
const ChatMessage=schema({id:t.string(),senderId:t.string(),name:t.string(),text:t.string(),sentAt:t.number()},'ChatMessage');
const SkyLantern=schema({ownerId:t.string(),x:t.number(),z:t.number(),color:t.string(),releasedAt:t.number(),expiresAt:t.number()},'SkyLantern');
const TempleState=schema({lanterns:t.map(SkyLantern),players:t.map(Pilgrim),offerings:t.map(Offering),messages:t.array(ChatMessage)},'TempleState');
type TempleState=SchemaType<typeof TempleState>;
export class TempleRoom extends Room<{state:TempleState}> {
  maxClients=5;
  state=new TempleState();
  private moved=new Map<string,number>();
  private interacted=new Map<string,number>();
  private chatted=new Map<string,number>();
  private chatSequence=0;
  private bellReadyAt=0;
  private lanternSequence=0;
  private emptyTimer?:ReturnType<typeof setTimeout>;
  onCreate(){
    void this.setPrivate(true);
    this.autoDispose=false;
    this.maxMessagesPerSecond=60;
    this.setPatchRate(50);
    this.onMessage('outfit',(client,data)=>{
      const p=this.state.players.get(client.sessionId);
      if(!p||!data||!OUTFITS.some(o=>o.id===data.outfit)||!COLORS.includes(data.color))return;
      p.outfit=data.outfit;p.color=data.color;
    });
    this.onMessage('chat',(client,data)=>{
      const p=this.state.players.get(client.sessionId);
      if(!p||!p.connected||typeof data?.text!=='string'||data.text.length>240)return;
      const text=data.text.replace(/[\p{C}]/gu,'').replace(/\s+/g,' ').trim();if(!text)return;
      const now=Date.now();if(now-(this.chatted.get(client.sessionId)??0)<1200){client.send('notice','Bạn hãy chờ một chút trước khi gửi lời tiếp theo.');return;}
      this.chatted.set(client.sessionId,now);
      const message=new ChatMessage();message.id=String(++this.chatSequence);message.senderId=client.sessionId;message.name=p.name;message.text=text;message.sentAt=now;
      this.state.messages.push(message);if(this.state.messages.length>50)this.state.messages.shift();
    });
    this.onMessage('move',(client,data)=>{
      const p=this.state.players.get(client.sessionId); if(!p||!data||p.action!=='idle')return;
      const {x,z,yaw}=data;if(!walkable(x,z)||!Number.isFinite(yaw))return;
      const now=Date.now();const dt=Math.min(0.5,(now-(this.moved.get(client.sessionId)??now))/1000);
      if(Math.hypot(x-p.x,z-p.z)>5.5*dt+0.35)return;
      p.x=x;p.z=z;p.yaw=yaw;this.moved.set(client.sessionId,now);
    });
    this.onMessage('travel',(client,zone)=>{
      const p=this.state.players.get(client.sessionId); if(typeof zone!=='string'||!Object.hasOwn(ZONES,zone))return;const target=ZONES[zone];if(!p||!target)return;
      this.stop(p);p.x=target.x;p.z=target.z;this.moved.set(client.sessionId,Date.now());
    });
    this.onMessage('stop',client=>{const p=this.state.players.get(client.sessionId);if(p)this.stop(p);});
    this.onMessage('act',(client,data)=>this.act(client,data));
    this.clock.setInterval(()=>{
      const now=Date.now();
      this.state.players.forEach(p=>{if(p.duration&&now>=p.startedAt+p.duration)this.stop(p);});
      this.state.offerings.forEach((o,id)=>{if(o.expiresAt<=now)this.state.offerings.delete(id);});
      this.state.lanterns.forEach((o,id)=>{if(o.expiresAt<=now)this.state.lanterns.delete(id);});
    },250);
    this.scheduleEmpty();
  }
  onJoin(client:Client,options:{name?:string;color?:string;outfit?:string}){
    if(this.emptyTimer)clearTimeout(this.emptyTimer);
    const p=new Pilgrim();p.name=String(options.name??'Khách').replace(/[\p{C}<>]/gu,'').trim().slice(0,24)||'Khách';
    p.color=COLORS.includes(options.color??'')?options.color!:COLORS[0];p.outfit=OUTFITS.some(o=>o.id===options.outfit)?options.outfit!:'lam';p.x=(this.state.players.size-2)*0.8;
    this.state.players.set(client.sessionId,p);this.moved.set(client.sessionId,Date.now());
  }
  private stop(p:Pilgrim){p.action='idle';p.startedAt=0;p.duration=0;p.seat=-1;}
  private act(client:Client,data:{id?:string;color?:string;minutes?:number}){
    const p=this.state.players.get(client.sessionId);if(!p||!data)return;
    const action=ACTIONS.find(a=>a.id===data.id);if(!action)return;
    const fail=(message:string)=>client.send('notice',message);
    const zone=ZONES[action.zone];if(Math.hypot(p.x-zone.x,p.z-zone.z)>actionRadius(action.id))return fail('Hãy đến gần khu vực thực hành.');
    const now=Date.now();if(action.id!=='lantern'&&now-(this.interacted.get(client.sessionId)??0)<450)return;
    if(action.id==='bell'&&now<this.bellReadyAt)return fail('Chuông đang ngân, bạn hãy chờ một nhịp.');
    this.interacted.set(client.sessionId,now);
    let seat=-1;
    if(['bow','chant','wood'].includes(action.id)){
      seat=SEATS.findIndex((_,i)=>![...this.state.players.entries()].some(([id,q])=>id!==client.sessionId&&q.seat===i));
      if(seat<0)return fail('Các đệm đang có người ngồi. Bạn hãy chờ một chút.');
    }
    if(action.id==='meditate'){
      const index=MEDITATION_SEATS.findIndex((_,i)=>![...this.state.players.entries()].some(([id,q])=>id!==client.sessionId&&q.seat===SEATS.length+i));
      if(index<0)return fail('Các đệm thiền đang có người ngồi.');
      seat=SEATS.length+index;
    }
    this.stop(p);p.action=action.id;p.startedAt=now;p.seat=seat;
    if(seat>=SEATS.length){Object.assign(p,MEDITATION_SEATS[seat-SEATS.length]);}
    else if(seat>=0){p.x=SEATS[seat].x;p.z=SEATS[seat].z;p.yaw=0;}
    p.duration=action.id==='meditate'?([3,5,10].includes(data.minutes??0)?data.minutes!:3)*60000:({bow:3600,incense:2800,flower:2800} as Record<string,number>)[action.id]??0;
    if(action.id==='bell'){
      p.x=BELL_STATION.x;p.z=BELL_STATION.z;p.yaw=BELL_STATION.yaw;p.duration=BELL_STATION.duration;
      this.bellReadyAt=now+BELL_STATION.duration;this.broadcast('bell',{id:client.sessionId,startedAt:now,impactAt:now+BELL_STATION.impact});
    }
    if(action.id==='lantern'){
      p.duration=2400;p.yaw=0;if(this.state.lanterns.size>=LANTERN_LIMIT){
        const oldest=this.state.lanterns.keys().next().value;
        if(oldest!==undefined)this.state.lanterns.delete(oldest);
      }
      const l=new SkyLantern();l.ownerId=client.sessionId;l.x=p.x;l.z=p.z-.65;l.color=LANTERN_COLORS.includes(data.color??'')?data.color!:LANTERN_COLORS[0];l.releasedAt=now+1200;l.expiresAt=l.releasedAt+LANTERN_LIFETIME;
      this.state.lanterns.set(String(++this.lanternSequence),l);
    }
    if(action.id==='incense'||action.id==='flower'){
      p.yaw=Math.atan2(p.x,p.z+.9);
      if(this.state.offerings.size>=20){const first=this.state.offerings.keys().next().value;if(first)this.state.offerings.delete(first);}
      const o=new Offering();o.kind=action.id;o.color=['#dda3aa','#f3e4c3','#bba6ce'].includes(data.color??'')?data.color!:'#dda3aa';o.expiresAt=now+180000;
      this.state.offerings.set(`${client.sessionId}-${now}`,o);
    }
  }
  async onDrop(client:Client){
    const p=this.state.players.get(client.sessionId);if(p)p.connected=false;
    try{await this.allowReconnection(client,30);if(p)p.connected=true;}catch{this.remove(client.sessionId);}
  }
  onLeave(client:Client){this.remove(client.sessionId);}
  private remove(id:string){this.state.players.delete(id);this.moved.delete(id);this.interacted.delete(id);this.chatted.delete(id);if(!this.state.players.size)this.scheduleEmpty();}
  private scheduleEmpty(){if(this.emptyTimer)clearTimeout(this.emptyTimer);this.emptyTimer=setTimeout(()=>{if(!this.state.players.size)void this.disconnect();},60000);}
  onDispose(){if(this.emptyTimer)clearTimeout(this.emptyTimer);}
}
