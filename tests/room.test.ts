import {test} from 'node:test';
import * as T from 'three';
import {createTempleArt} from '../src/temple-art.ts';
import {animateAvatar} from '../src/avatar-animation.ts';
import {BELL_STATION,MAP_BOUNDS,ZONES,walkable,groundHeight,inHall} from '../src/shared.ts';
import {cameraOrbit,CAMERA_LIMITS} from '../src/camera.ts';
import assert from 'node:assert/strict';
import {matchMaker} from '@colyseus/core';
import {Client,type Room} from '@colyseus/sdk';
import {TempleRoom} from '../server/TempleRoom.ts';
import {createTempleServer} from '../server/app.ts';
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(check:()=>boolean,label:string,timeout=5000){const start=Date.now();while(!check()){if(Date.now()-start>timeout)throw new Error('Timed out: '+label);await delay(30);}}
test('expanded map doubles the footprint and keeps water and hall walls blocked',()=>{
  assert.equal((MAP_BOUNDS.maxX-MAP_BOUNDS.minX)*(MAP_BOUNDS.maxZ-MAP_BOUNDS.minZ),2*60*26);
  for(const key of ['waterfall','bell','pavilion','lantern','bamboo']){
    const p=ZONES[key];assert.ok(walkable(p.x,p.z),key+' is reachable');assert.equal(groundHeight(p.x,p.z),0);assert.equal(inHall(p.x,p.z),false);
  }
  for(const [x,z]of [[-10,5],[-24,4],[-25,-1],[10.5,-8],[15,-10],[-15,-10],[-30.1,0],[30.1,0],[0,42.1],[-17,29],[8,22],[0,-10.1]])assert.equal(walkable(x,z),false,`${x},${z}`);
  for(let z=16;z<=42;z++)assert.ok(walkable(0,z));
  assert.equal(walkable(-29,12),true);assert.equal(walkable(29,12),true);assert.equal(walkable(NaN,0),false);
  assert.equal(groundHeight(0,-7),.86);assert.equal(groundHeight(22,-7),0);
});
test('camera supports skyward pitch without orbiting under the ground',()=>{
  const sky=cameraOrbit(22,-.78);assert.ok(sky.lookUp>sky.horizontal*.9);assert.equal(sky.height,0);
  const down=cameraOrbit(22,.6);assert.ok(down.height>0);assert.equal(down.lookUp,0);
  for(const pitch of [-20,CAMERA_LIMITS.minPitch,0,CAMERA_LIMITS.maxPitch,20]){
    const view=cameraOrbit(200,pitch);assert.ok(Number.isFinite(view.lookUp));assert.ok(view.height>=0);assert.ok(view.horizontal>0&&view.horizontal<=48);
  }
});

test('articulated rituals stay above the floor and bow toward the altar',()=>{
  const art=createTempleArt();
  for(const outfit of ['lam','trang','cheo'] as const){
    const p={id:'test',name:'Test',color:'#819a90',outfit,x:0,z:0,yaw:0,action:'bow' as const,startedAt:Date.now()-1800,duration:3600,seat:0,connected:true};
    const rig=art.avatar(p);animateAvatar(rig,p,false,1.8);rig.group.updateMatrixWorld(true);
    const head=new T.Vector3(0,1.83,0).applyMatrix4(rig.upper.matrixWorld);
    assert.ok(head.z<-.9&&head.y<1,'bows forward around hip');assert.equal(rig.kneeling.visible,true);assert.equal(rig.standing.visible,false);
    const visibleBounds=new T.Box3();rig.group.traverseVisible(o=>{if(o instanceof T.Mesh){o.geometry.computeBoundingBox();visibleBounds.union(o.geometry.boundingBox!.clone().applyMatrix4(o.matrixWorld));}});
    assert.ok(visibleBounds.min.y>-.12,'no body sinks below the mat');
    for(const action of ['meditate','chant','beads','wood','incense','flower','bell','idle'] as const){
      animateAvatar(rig,{...p,action,startedAt:Date.now()-500},false,.5);
      assert.equal(rig.seated.visible,['meditate','chant','beads','wood'].includes(action));assert.equal(rig.kneeling.visible,false);
      assert.ok(Number.isFinite(rig.armL.root.quaternion.x)&&Number.isFinite(rig.armR.forearm.quaternion.w));
    }
    rig.group.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});
  }
  art.dispose();
});

test('real rooms: capacity, state, actions, validation, reconnect, cleanup', {timeout:45000},async(t)=>{
  const {game:server,http}=createTempleServer();await server.listen(0,'127.0.0.1');
  const port=(http.address() as {port:number}).port;const client=new Client(`ws://127.0.0.1:${port}`);const rooms:Room[]=[];
  const register=(r:Room)=>{r.onMessage('notice',()=>{});r.onMessage('wood',()=>{});r.onMessage('bell',()=>{});rooms.push(r);return r;};
  try{
    await t.test('HTTP and matchmaking share one server without double responses',async()=>{
      const health=await fetch(`http://127.0.0.1:${port}/health`);assert.deepEqual(await health.json(),{ok:true});
      const options=await fetch(`http://127.0.0.1:${port}/matchmake/create/temple`,{method:'OPTIONS'});assert.equal(options.status,204);
      const page=await fetch(`http://127.0.0.1:${port}/`);assert.equal(page.status,200);assert.match(await page.text(),/An Nhiên/);
    });
    const first=register(await client.create('temple',{name:'An',color:'#819a90'}));
    for(let i=1;i<5;i++)register(await client.joinById(first.roomId,{name:`Bạn ${i}`}));
    await until(()=>rooms.every(r=>r.state.players?.size===5),'all five clients see each other');
    await t.test('sixth visitor rejected',async()=>{await assert.rejects(client.joinById(first.roomId,{name:'Sixth'}));});
    await t.test('invalid actions and impossible movement rejected',async()=>{
      const before=first.state.players.get(first.sessionId).x;
      first.send('move',{x:14,z:-10,yaw:0});first.send('act',{id:'bow'});await delay(120);
      assert.equal(first.state.players.get(first.sessionId).x,before);assert.equal(first.state.players.get(first.sessionId).action,'idle');
      first.send('move',{x:NaN,z:0,yaw:0});first.send('act',{id:'unknown'});await delay(100);assert.equal(first.state.players.size,5);
    });
    await t.test('five simultaneous chants reserve unique seats',async()=>{
      rooms.forEach(r=>{r.send('travel','hall');r.send('act',{id:'chant'});});
      await until(()=>[...first.state.players.values()].every(p=>p.action==='chant'),'all seated');
      assert.equal(new Set([...first.state.players.values()].map(p=>p.seat)).size,5);
    });
    await t.test('offerings and action are shared; spam is throttled',async()=>{
      await delay(500);first.send('travel','offering');first.send('act',{id:'flower',color:'#bba6ce'});
      await until(()=>rooms.every(r=>r.state.offerings.size===1),'flower on all clients');
      assert.equal([...rooms[1].state.offerings.values()][0].color,'#bba6ce');
      for(let i=0;i<10;i++)first.send('act',{id:'flower'});await delay(100);assert.equal(first.state.offerings.size,1);
      await delay(500);first.send('act',{id:'incense'});await until(()=>first.state.offerings.size===2,'incense');
    });
    await t.test('all remaining rituals and cancellation',async()=>{
      await delay(500);first.send('travel','hall');first.send('act',{id:'bow'});await until(()=>first.state.players.get(first.sessionId).action==='bow','bow begins');
      await until(()=>first.state.players.get(first.sessionId).action==='idle','bow ends');
      first.send('act',{id:'wood'});await until(()=>first.state.players.get(first.sessionId).action==='wood','wood');
      await delay(1050);assert.equal(first.state.players.get(first.sessionId).action,'wood');first.send('stop');await until(()=>first.state.players.get(first.sessionId).action==='idle','wood stops');first.send('travel','garden');first.send('act',{id:'beads'});await until(()=>first.state.players.get(first.sessionId).action==='beads','beads');
      await delay(500);first.send('act',{id:'meditate',minutes:5});await until(()=>first.state.players.get(first.sessionId).action==='meditate','meditation');assert.equal(first.state.players.get(first.sessionId).duration,300000);
      first.send('stop');await until(()=>first.state.players.get(first.sessionId).action==='idle','stop');
    });
    await t.test('expired offerings and meditation finish',async()=>{
      const serverRoom=matchMaker.getLocalRoomById(first.roomId) as TempleRoom;
      serverRoom.state.offerings.forEach(o=>o.expiresAt=Date.now()-1);
      const player=serverRoom.state.players.get(first.sessionId)!;player.action='meditate';player.startedAt=Date.now()-2000;player.duration=1000;
      await until(()=>first.state.offerings.size===0&&first.state.players.get(first.sessionId).action==='idle','expiration');
    });
    await t.test('dropped participant reconnects to the same slot',async()=>{
      const dropped=rooms[4];const id=dropped.sessionId;dropped.reconnection.minUptime=0;
      let reconnected=false;dropped.onReconnect(()=>reconnected=true);dropped.connection.close(4010);
      await until(()=>reconnected,'reconnection',10000);assert.equal(dropped.sessionId,id);assert.equal(first.state.players.size,5);
    });
    await t.test('outfit changes synchronize and invalid styles are ignored',async()=>{
      for(const outfit of ['lam','trang','cheo']){
        first.send('outfit',{outfit,color:'#b7a4bf'});
        await until(()=>rooms.every(r=>r.state.players.get(first.sessionId).outfit===outfit&&r.state.players.get(first.sessionId).color==='#b7a4bf'),'outfit '+outfit);
      }
      first.send('outfit',{outfit:'invalid',color:'#819a90'});first.send('outfit',{outfit:'lam',color:'url(evil)'});await delay(120);
      assert.equal(first.state.players.get(first.sessionId).outfit,'cheo');assert.equal(first.state.players.get(first.sessionId).color,'#b7a4bf');
    });
    await t.test('chat is shared, sender identity is authoritative, and spam is throttled',async()=>{
      first.send('chat',{text:'  Chào mọi người, chúc an lành!  ',senderId:'spoofed',name:'Spoofed'});
      await until(()=>rooms.every(r=>r.state.messages.length===1),'shared chat');
      const m=rooms[1].state.messages[0];assert.equal(m.senderId,first.sessionId);assert.equal(m.name,'An');assert.equal(m.text,'Chào mọi người, chúc an lành!');
      for(let i=0;i<5;i++)first.send('chat',{text:'spam'});await delay(120);assert.equal(first.state.messages.length,1);
      await delay(1200);first.send('chat',{text:'x'.repeat(241)});first.send('chat',{text:'   '});first.send('chat',{text:42});await delay(120);assert.equal(first.state.messages.length,1);
      const literal='<img src=x onerror=alert(1)> & lời chào';first.send('chat',{text:literal});await until(()=>first.state.messages.length===2,'plain text message');assert.equal(first.state.messages[1].text,literal);
    });
    await t.test('chat stays within its room, history is capped, and late joiners receive history',async()=>{
      const separate=register(await client.create('temple',{name:'Khách khác',outfit:'trang'}));await until(()=>separate.state.players?.size===1,'second room');
      assert.equal(separate.state.players.get(separate.sessionId).outfit,'trang');assert.equal(separate.state.messages.length,0);
      const serverRoom=matchMaker.getLocalRoomById(first.roomId) as TempleRoom;
      // Advance the rate-limit clock between messages to test retention without a minute-long wait.
      for(let i=0;i<53;i++){
        (serverRoom as unknown as {chatted:Map<string,number>}).chatted.delete(first.sessionId);
        first.send('chat',{text:'Lời an lành '+i});await until(()=>serverRoom.state.messages.at(-1)?.text==='Lời an lành '+i,'history message '+i);
      }
      await until(()=>first.state.messages.at(-1)?.text==='Lời an lành 52','history propagated');assert.equal(first.state.messages.length,50);assert.equal(separate.state.messages.length,0);
      await separate.leave();
      await rooms[4].leave();await until(()=>first.state.players.size===4,'make room');
      const late=register(await client.joinById(first.roomId,{name:'Người mới'}));await until(()=>late.state.messages?.length===50,'late history');assert.equal(late.state.messages.at(-1).text,'Lời an lành 52');
    });
    await t.test('new garden destinations synchronize and movement works outside the old map',async()=>{
      for(const zone of ['waterfall','bell','pavilion','lantern','bamboo']){
        first.send('travel',zone);const expected=ZONES[zone];await until(()=>Math.abs(rooms[1].state.players.get(first.sessionId).x-expected.x)<.001&&Math.abs(rooms[1].state.players.get(first.sessionId).z-expected.z)<.001,'travel '+zone);
      }
      first.send('move',{x:22.2,z:-6,yaw:0});await until(()=>Math.abs(rooms[1].state.players.get(first.sessionId).x-22.2)<.001,'walk in expanded area');
      first.send('move',{x:31,z:-6,yaw:0});await delay(100);assert.ok(Math.abs(first.state.players.get(first.sessionId).x-22.2)<.001);
    });
    await t.test('temple bell validates distance, shares impact timing, locks one striker and finishes',async()=>{
      first.send('travel','hall');first.send('act',{id:'bell'});await delay(120);assert.equal(first.state.players.get(first.sessionId).action,'idle');
      const received:{id:string;startedAt:number;impactAt:number}[]=[];rooms[1].onMessage('bell',message=>received.push(message));
      first.send('travel','bell');first.send('act',{id:'bell'});
      await until(()=>rooms[1].state.players.get(first.sessionId).action==='bell'&&received.length===1,'shared bell strike');
      const p=first.state.players.get(first.sessionId);assert.ok(Math.abs(p.z-BELL_STATION.z)<.001);assert.equal(p.yaw,0);assert.equal(p.seat,-1);assert.equal(p.duration,BELL_STATION.duration);
      assert.equal(received[0].id,first.sessionId);assert.equal(received[0].impactAt-received[0].startedAt,BELL_STATION.impact);
      rooms[1].send('travel','bell');rooms[1].send('act',{id:'bell'});await delay(100);assert.equal(rooms[1].state.players.get(rooms[1].sessionId).action,'idle');
      for(let i=0;i<4;i++)first.send('act',{id:'bell'});await delay(100);assert.equal(received.length,1);
      await until(()=>first.state.players.get(first.sessionId).action==='idle','bell animation ends');
      rooms[1].send('act',{id:'bell'});await until(()=>received.length===2,'second visitor can ring');
    });
    await t.test('creator leaving keeps other participants in room',async()=>{
      await first.leave();await until(()=>rooms[1].state.players.size===4,'creator removed');
      const replacement=register(await client.joinById(first.roomId,{name:'Replacement'}));await until(()=>replacement.state.players?.size===5,'replacement joins');
    });
  }finally{await Promise.all(rooms.map(r=>r.leave().catch(()=>{})));await server.gracefullyShutdown(false);}
});


test('sky lanterns validate location, synchronize, survive late join and expire with bounded capacity',{timeout:15000},async()=>{
  const {game:server,http}=createTempleServer();await server.listen(0,'127.0.0.1');
  const client=new Client(`ws://127.0.0.1:${(http.address() as {port:number}).port}`),rooms:Room[]=[];
  const add=(r:Room)=>{r.onMessage('notice',()=>{});rooms.push(r);return r;};
  try{
    const first=add(await client.create('temple',{name:'An'})),other=add(await client.joinById(first.roomId,{name:'Bình'}));
    await until(()=>first.state.players?.size===2,'joined');
    first.send('act',{id:'lantern'});await delay(100);assert.equal(first.state.lanterns.size,0,'not at lantern court');
    first.send('travel','lantern');first.send('act',{id:'lantern',color:'#ec789a',ownerId:'fake',x:500});
    await until(()=>other.state.lanterns.size===1,'lantern shared');
    const l=[...other.state.lanterns.values()][0] as {ownerId:string;x:number;z:number;color:string;releasedAt:number;expiresAt:number};
    assert.equal(l.ownerId,first.sessionId);assert.equal(l.color,'#ec789a');assert.equal(l.x,17);assert.ok(Math.abs(l.z-12.35)<.01);assert.equal(l.expiresAt-l.releasedAt,60000);
    assert.equal(other.state.players.get(first.sessionId).action,'lantern');
    first.send('act',{id:'lantern'});first.send('act',{id:'lantern'});await until(()=>other.state.lanterns.size===3,'rapid consecutive releases');
    other.send('travel','lantern');other.send('act',{id:'lantern',color:'invalid'});await until(()=>first.state.lanterns.size===4,'another visitor releases');
    assert.equal(([...first.state.lanterns.values()][3] as {color:string}).color,'#ef582c');
    const late=add(await client.joinById(first.roomId,{name:'Late'}));await until(()=>late.state.lanterns?.size===4,'late visitor sees existing flight');
    const isolated=add(await client.create('temple',{name:'Separate'}));await until(()=>isolated.state.players?.size===1,'isolated room');assert.equal(isolated.state.lanterns.size,0);
    const local=matchMaker.getLocalRoomById(first.roomId) as TempleRoom;
    const seed=[...local.state.lanterns.values()][0],Constructor=Object.getPrototypeOf(seed).constructor as new()=>typeof seed;
    for(let i=4;i<24;i++){const copy=new Constructor();Object.assign(copy,{ownerId:'seed',x:17,z:13,color:'#ef582c',releasedAt:Date.now(),expiresAt:Date.now()+60000});local.state.lanterns.set('seed'+i,copy);}
    await until(()=>late.state.lanterns.size===24,'capacity filled');late.send('travel','lantern');late.send('act',{id:'lantern'});await until(()=>[...local.state.lanterns.values()].some(l=>l.ownerId===late.sessionId),'new release replaces oldest');assert.equal(local.state.lanterns.size,24);
    local.state.lanterns.forEach(l=>l.expiresAt=Date.now()-1);await until(()=>rooms.slice(0,3).every(r=>r.state.lanterns.size===0),'expired lanterns cleaned on all clients');
    late.send('act',{id:'lantern'});await until(()=>first.state.lanterns.size===1,'capacity is reusable');
  }finally{await Promise.all(rooms.map(r=>r.leave().catch(()=>{})));await server.gracefullyShutdown(false);}
});
