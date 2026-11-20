import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createLandscape} from './landscape';
import {createArchitecture} from './architecture';
import {createLanterns} from './lanterns';
import {ASH_HEIGHT,URN_Z,createCenser,createSmoke} from './incense';
import {createSky} from './sky';
import {cameraOrbit,clampDistance,clampPitch} from './camera';
import {animateAvatar,type AvatarRig} from './avatar-animation';
import {createTempleArt} from './temple-art';
import { MEDITATION_SEATS, SEATS, walkable, inHall, groundHeight, type WorldView, type PlayerView } from './shared';
export function createTemple(host:HTMLElement,onMove:(x:number,z:number,yaw:number)=>void,onError:()=>void){
  const art=createTempleArt();const architecture=createArchitecture();
  const scene=new T.Scene();scene.background=new T.Color('#c9d5cb');scene.fog=new T.Fog('#d5e2d6',60,180);
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  host.appendChild(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',onError);
  const camera=new T.PerspectiveCamera(43,1,0.1,320);
  const hemisphere=new T.HemisphereLight('#fff5db','#5a7564',2.4);scene.add(hemisphere);
  const sun=new T.DirectionalLight('#fff0ce',3.2);sun.position.set(-18,32,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-42,right:42,top:38,bottom:-38,near:1,far:120});sun.shadow.bias=-0.001;scene.add(sun);
  const mats=new Map<string,T.MeshStandardMaterial>();
  const mat=(color:string)=>{if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:0.87}));return mats.get(color)!;};
  const mesh=(geo:T.BufferGeometry,color:string,x:number,y:number,z:number,parent:T.Object3D=scene)=>{const m=new T.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(w:number,h:number,d:number,c:string,x:number,y:number,z:number,p:T.Object3D=scene)=>mesh(new T.BoxGeometry(w,h,d),c,x,y,z,p);
  const cyl=(r:number,h:number,c:string,x:number,y:number,z:number,p:T.Object3D=scene)=>mesh(new T.CylinderGeometry(r,r,h,12),c,x,y,z,p);
  const ball=(r:number,c:string,x:number,y:number,z:number,p:T.Object3D=scene)=>mesh(new T.SphereGeometry(r,12,8),c,x,y,z,p);
  box(240,0.5,240,'#396734',0,-0.5,0);
  box(61,0.16,57,'#a88a58',0,-0.17,16);
  box(8,0.08,57,'#bd9b65',0,-0.04,16);
  for(const x of [-23,23])box(15,.12,57,'#477c39',x,-.12,16);
  // Courtyard pavers, deliberately grouped into a few materials.
  for(let z=-3;z<43;z+=2)for(let x=-4;x<4;x+=2)box(1.94,0.04,1.94,(x+z)%4?'#d5b27a':'#ad804c',x+1,0,z+1);
  box(22,0.65,13,'#b9b5a0',0,0.27,-11);box(23,0.18,13.6,'#d2ccb7',0,0.68,-11);
  for(let i=0;i<3;i++)box(8+i*0.65,0.22,0.8,'#c6c1ae',0,0.12+i*0.2,-3.9-i*0.65);
  box(21.5,0.08,12.6,'#673b27',0,0.81,-11);
  const roof=(w:number,d:number,y:number,z:number,p:T.Object3D=scene)=>architecture.roof(p,w,d,y,0,z);
  for(const x of [-10,-5,5,10])for(const z of [-5.5,-16.5]){cyl(.38,7.2,'#a8231b',x,4.5,z);cyl(.6,.4,'#c0b79e',x,1.02,z);cyl(.44,.2,'#d4a641',x,7.95,z);cyl(.43,.15,'#d4a641',x,1.35,z);}
  const templeRoof=new T.Group();scene.add(templeRoof);
  box(21,.5,.5,'#74231a',0,7.9,-5.5,templeRoof);box(21,.5,.5,'#74231a',0,7.9,-16.5);
  box(21,7.1,.3,'#bd9152',0,4.4,-17);
  for(const x of [-10.5,10.5]){box(.3,2,11.5,'#a47b42',x,1.85,-11);for(let z=-16.5;z<-6;z+=.6)box(.14,4.4,.14,'#4b281d',x,4.95,z);}
  box(15.8,1.8,7.2,'#74231a',0,10,-11,templeRoof);
  for(const x of [-6,-4,-2,0,2,4,6]){box(.12,1.1,.14,'#d4a641',x,10,-7.32,templeRoof);box(.12,1.1,.14,'#d4a641',x,10,-14.68,templeRoof);}
  roof(23.5,14,8.9,-11,templeRoof);roof(18,10,11,-11,templeRoof);
  for(const x of [-8,-4,0,4,8])architecture.hang(templeRoof,x,7.8,-5.25,.58);
  for(const x of [-15,15])architecture.pagoda(scene,x,-10);
  const label=(text:string,size=128)=>{const c=document.createElement('canvas');c.width=512;c.height=size;const ctx=c.getContext('2d')!;ctx.fillStyle='rgba(35,48,39,.7)';ctx.beginPath();ctx.roundRect(10,10,492,size-20,24);ctx.fill();ctx.fillStyle='#fff5d8';ctx.font='500 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,size/2);const tex=new T.CanvasTexture(c);const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true}));return s;};
  // Ivory Buddha with sculpted robes, lotus petals and a gold mandorla.
  box(5.8,.7,2.9,'#71503a',0,1.2,-12.5);box(6,.12,3.1,'#b59a62',0,1.6,-12.5);
  const statue=art.buddha();statue.scale.setScalar(1.23);statue.position.set(0,1.72,-13.4);scene.add(statue);
  for(const seat of SEATS){
    box(1.6,.045,1.7,'#785e4e',seat.x,.9,seat.z);box(1.45,.05,1.55,'#bb9a68',seat.x,.93,seat.z);
    const cushion=ball(.61,'#c1ad7d',seat.x,1.04,seat.z);cushion.scale.set(1,.2,.9);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;const seam=box(.012,.015,.5,'#ac9669',seat.x+Math.sin(a)*.27,1.15,seat.z+Math.cos(a)*.27);seam.rotation.y=a;}
  }
  for(let i=0;i<31;i++)box(21.4,.012,.022,'#644b3d',0,.86,-16.9+i*.4);
  // Incense terrace and lamps.
  const disposeCenser=createCenser(scene);
  for(const x of [-2.45,2.45]){
    box(.91,.12,.91,'#b4aa95',x,.06,URN_Z);
    box(.72,.55,.72,'#918976',x,.39,URN_Z);
    box(.94,.12,.94,'#c4baa5',x,.72,URN_Z);
    mesh(new T.LatheGeometry([[.19,0],[.24,.06],[.35,.29],[.31,.46],[.17,.59],[.21,.64]].map(([r,y])=>new T.Vector2(r,y)),32),'#547973',x,.78,URN_Z);
    for(let i=0;i<3;i++){
      const xx=(i-1)*.19,yy=1.84+(i%2)*.21;
      cyl(.018,yy-1.38,'#61774a',x+xx,(yy+1.38)/2,URN_Z);
      for(let j=0;j<7;j++){
        const angle=j*Math.PI*2/7;
        const petal=ball(.12,'#dfa2ac',x+xx+Math.sin(angle)*.09,yy,URN_Z+Math.cos(angle)*.09);
        petal.scale.set(.57,1.22,.45);petal.rotation.set(Math.cos(angle)*.44,0,-Math.sin(angle)*.44);
      }
      ball(.056,'#e6bb68',x+xx,yy+.064,URN_Z);
    }
  }
  for(const x of [-5,5])for(const z of [3,9,14]){box(0.65,0.3,0.65,'#8e8d73',x,0.15,z);box(0.42,0.7,0.42,'#5b5b49',x,0.65,z);box(0.31,0.38,0.44,'#f4df9c',x,0.7,z);box(0.85,0.17,0.85,'#6d6a50',x,1.08,z);}
  // Lotus pond.
  const water=mesh(new T.CylinderGeometry(4.7,4.7,0.12,40),'#277f80',-10,0.01,5);water.scale.z=0.88;
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const rock=ball(0.5,'#959a83',-10+4.8*Math.cos(a),0.12,5+4.2*Math.sin(a));rock.scale.y=0.5;}
  for(let i=0;i<12;i++){const a=i*2.399,r=1+((i*7)%30)/10;const x=-10+Math.cos(a)*r,z=5+Math.sin(a)*r*0.8;const leaf=cyl(0.49,0.03,'#548b37',x,0.13,z);leaf.rotation.z=0.05;if(i%2===0){for(let j=0;j<5;j++){const petal=ball(0.16,'#e994ab',x+Math.cos(j*1.26)*0.14,0.27,z+Math.sin(j*1.26)*0.14);petal.scale.set(0.65,1,1.3);}}}
  // Quiet garden.
  cyl(3.95,.12,'#8f9885',10,0,3);
  cyl(3.73,.065,'#c5bfaa',10,.08,3);
  for(const seat of MEDITATION_SEATS){
    cyl(.82,.12,'#765c40',seat.x,.17,seat.z);
    cyl(.76,.13,'#be945c',seat.x,.27,seat.z);
    cyl(.67,.045,'#e0bd81',seat.x,.35,seat.z);
  }
  const tree=(x:number,z:number,s=1)=>{
    cyl(.23*s,3.5*s,'#716048',x,1.7*s,z);
    for(let i=0;i<7;i++){
      const angle=i*2.4,reach=(i<4?1.15:.65)*s;
      const dx=Math.cos(angle)*reach,dz=Math.sin(angle)*reach,h=(3.25+i*.31)*s;
      const start=new T.Vector3(x,2.15*s,z),end=new T.Vector3(x+dx,h,z+dz);
      const limb=cyl(.105*s,start.distanceTo(end),'#79664d',(start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2);
      limb.quaternion.setFromUnitVectors(T.Object3D.DEFAULT_UP,end.sub(start).normalize());
      const crown=ball((1.38-i*.055)*s,['#295a38','#397348','#558650','#699455'][i%4],x+dx,h+.48*s,z+dz);
      crown.scale.set(1.16,.7,1);
    }
  };
  for(const [x,z,s]of [[13,8,1.3],[12,-3,1],[-14,-3,1.4],[-13,13,1.1],[15,-13,1.3],[-15,-15,1.6],[8,15,0.8]])tree(x,z,s);
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2;if(Math.cos(a)>.95)continue;tree(Math.sin(a)*60,Math.cos(a)*58,1.3+(i%3)*0.4);}
  // Monumental three-portal entrance, with clear walking space between the piers.
  const gate=new T.Group();gate.position.set(0,0,43);scene.add(gate);
  for(const x of [-9,-4,4,9]){const h=Math.abs(x)===4?6.5:5;box(.95,h,.95,'#dfc68e',x,h/2,0,gate);box(1.35,.4,1.35,'#8a6243',x,.2,0,gate);box(.45,h-1,.07,'#59221d',x,h/2,.51,gate);for(let y=1;y<h-.6;y+=.85)box(.18,.28,.09,'#d5a638',x,y,.56,gate);}
  box(6.2,1.5,1.9,'#74231a',0,8.1,0,gate);roof(10,4.5,7,0,gate);roof(7.5,3.3,8.8,0,gate);
  for(const x of [-6.5,6.5]){architecture.roof(gate,6,4,5.65,x,0);architecture.hang(gate,x,5.2,0,.55);}
  for(const x of [-2.6,2.6])architecture.hang(gate,x,6.5,0,.72);
  for(const x of [-20,20]){box(21,1.65,.5,'#d9bf89',x,.825,43);box(21,.18,.7,'#9f281b',x,1.7,43);}
  // Batch static geometry by material; keep the hall roof independently hideable.
  scene.updateMatrixWorld(true);
  function batchStatic(root:T.Object3D,exclude?:T.Object3D){
    root.updateWorldMatrix(true,true);
    const groups=new Map<T.Material,{parts:T.BufferGeometry[];objects:T.Mesh[]}>();
    root.traverse(object=>{if(!(object instanceof T.Mesh))return;let parent:T.Object3D|null=object;while(parent){if(parent===exclude)return;parent=parent.parent;}
      const material=object.material as T.Material;let group=groups.get(material);if(!group){group={parts:[],objects:[]};groups.set(material,group);}group.parts.push(object.geometry.clone().applyMatrix4(object.matrixWorld));group.objects.push(object);
    });
    groups.forEach(({parts,objects},material)=>{
      if(parts.some(part=>part.index===null)){
        parts.forEach((part,i)=>{if(part.index){parts[i]=part.toNonIndexed();part.dispose();}});
      }
      const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)return;objects.forEach(o=>{o.removeFromParent();o.geometry.dispose();});const merged=new T.Mesh(geometry,material);merged.castShadow=true;merged.receiveShadow=true;root.add(merged);});
  }
  batchStatic(scene,templeRoof);batchStatic(templeRoof);
  const landscape=createLandscape(scene);batchStatic(landscape.staticRoot);
  const sky=createSky(scene);const lanterns=createLanterns(scene);
  const smoke=createSmoke(scene);
  const lamps=[...landscape.lampPositions];
  for(const x of [-5,5])for(const z of [3,9,14])lamps.push(new T.Vector3(x,.7,z));
  const glowMap=document.createElement('canvas');glowMap.width=glowMap.height=96;
  const brush=glowMap.getContext('2d')!,falloff=brush.createRadialGradient(48,48,0,48,48,48);
  for(const [at,alpha] of [[0,.95],[.16,.55],[.48,.16],[1,0]])falloff.addColorStop(at,`rgba(255,255,255,${alpha})`);
  brush.fillStyle=falloff;brush.fillRect(0,0,96,96);
  const glowTexture=new T.CanvasTexture(glowMap);
  const poolMaterial=new T.MeshBasicMaterial({color:'#ffc074',map:glowTexture,blending:T.AdditiveBlending,transparent:true,depthWrite:false});
  const haloMaterial=new T.SpriteMaterial({color:'#ffd18a',map:glowTexture,blending:T.AdditiveBlending,transparent:true,depthWrite:false});
  const pools=new T.InstancedMesh(new T.PlaneGeometry(1,1),poolMaterial,lamps.length);
  const placement=new T.Object3D();placement.rotation.x=-Math.PI/2;
  const halos=new T.Group();scene.add(halos,pools);
  lamps.forEach((lamp,i)=>{
    const halo=new T.Sprite(haloMaterial);halo.position.copy(lamp);halo.scale.setScalar(1.65);halos.add(halo);
    const diameter=lamp.y<1?3.8:5.6;placement.scale.set(diameter,diameter,1);
    placement.position.set(lamp.x,.13,lamp.z);placement.updateMatrix();pools.setMatrixAt(i,placement.matrix);
  });
  const nightLamps=[[-5,1.2,3],[5,1.2,3],[10,2.2,-.95],[4.9,2,29],[0,4,-10],[-22,3,-5],[22,3,6]].map(([x,y,z])=>{const light=new T.PointLight('#ffc783',0,13,2);light.position.set(x,y,z);scene.add(light);return light;});
  const daylight=new T.Color('#fff0ce'),moonlight=new T.Color('#a6c5ff'),dayFog=new T.Color('#d5e2d6'),nightFog=new T.Color('#17263f');
  const dayGround=new T.Color('#5a7564'),nightGround=new T.Color('#202d47'),dayAmbient=new T.Color('#fff5db'),nightAmbient=new T.Color('#9baed7');
  let raining=false;
  function updateLighting(){const n=sky.nightBlend;hemisphere.intensity=T.MathUtils.lerp(1.7,.85,n);hemisphere.color.copy(dayAmbient).lerp(nightAmbient,n);hemisphere.groundColor.copy(dayGround).lerp(nightGround,n);
    sun.intensity=T.MathUtils.lerp(2.7,.75,n)*(raining?.48:1);sun.color.copy(daylight).lerp(moonlight,n);sun.position.z=T.MathUtils.lerp(18,-26,n);
    (scene.fog as T.Fog).far=raining?104:180;(scene.fog as T.Fog).color.copy(dayFog).lerp(nightFog,n);(scene.background as T.Color).copy((scene.fog as T.Fog).color);
    renderer.toneMappingExposure=T.MathUtils.lerp(1.03,1,n);nightLamps.forEach(light=>light.intensity=2+n*42);
    const lamp=mats.get('#f4df9c');if(lamp){lamp.emissive.set('#ffc16d');lamp.emissiveIntensity=.24+n*3;}
    haloMaterial.opacity=.12+n*.63;poolMaterial.opacity=.08+n*.72;
    landscape.setNight(n);architecture.setNight(n);lanterns.setNight(n);
  }
  const garden=art.garden(scene);
  const bubbleLayer=document.createElement("div");bubbleLayer.className="speech-layer";host.appendChild(bubbleLayer);
  const bubblePosition=new T.Vector3();
  const avatars=new Map<string,AvatarRig&{name:T.Sprite;target:PlayerView;bubble:HTMLDivElement;messageId:string;speaksUntil:number;appearance:string}>();
  const offerings=new T.Group();scene.add(offerings);let offeringSignature='';
  let selfId='';let target:T.Vector3|null=null;let yaw=0;let pitch=.6;let distance=22;let overview=true;let dragging=false;let movedPointer=false;let lastX=0;let lastY=0;let startX=0;let startY=0;let frame=0;let last=performance.now();let lastSend=0;let wasWalking=false;let disposed=false;let keys=new Set<string>();
  const pointers=new Map<number,{x:number;y:number}>();let pinchDistance=0;
  const look=new T.Vector3(0,1,-3);const ray=new T.Raycaster();const plane=new T.Plane(new T.Vector3(0,1,0),0);const marker=mesh(new T.RingGeometry(0.28,0.36,24),'#f4e8b7',0,0.06,0);marker.rotation.x=-Math.PI/2;marker.visible=false;
  function setWorld(world:WorldView,id:string){lanterns.setWorld(world.lanterns);const strike=world.players.find(p=>p.action==='bell');if(strike)landscape.ringBell(strike.startedAt);selfId=id;if(!id){overview=true;target=null;marker.visible=false;}
    const ids=new Set(world.players.map(p=>p.id));for(const [key,a]of avatars)if(!ids.has(key)){scene.remove(a.group);disposeGroup(a.group);a.bubble.remove();avatars.delete(key);}
    for(const p of world.players){let a=avatars.get(p.id);const appearance=p.outfit+p.color;
      let previousPosition:T.Vector3|undefined,previousYaw=0;
      if(a&&a.appearance!==appearance){previousPosition=a.group.position.clone();previousYaw=a.group.rotation.y;scene.remove(a.group);disposeGroup(a.group);a.bubble.remove();avatars.delete(p.id);a=undefined;}
      if(!a){const model=art.avatar(p),g=model.group;scene.add(g);
        const name=label(p.name,96);name.scale.set(2.5,.47,1);name.position.y=2.65;g.add(name);
        g.position.set(p.x,groundHeight(p.x,p.z),p.z);if(previousPosition){g.position.copy(previousPosition);g.rotation.y=previousYaw;}
        const bubble=document.createElement('div');bubble.className='speech-bubble';bubble.hidden=true;bubbleLayer.appendChild(bubble);
        a={...model,name,target:p,bubble,messageId:'',speaksUntil:0,appearance};avatars.set(p.id,a);
        if(p.id===id){const ring=mesh(new T.TorusGeometry(.57,.025,6,32),'#e4d39a',0,.06,0,g);ring.rotation.x=Math.PI/2;overview=false;}
      }
      const latest=[...world.messages].reverse().find(m=>m.senderId===p.id);
      if(latest&&latest.id!==a.messageId){a.messageId=latest.id;a.bubble.textContent=latest.text;a.speaksUntil=Math.min(Date.now()+9000,latest.sentAt+9000);}
    if(p.id===id&&(p.action!=='idle'||Math.hypot(a.group.position.x-p.x,a.group.position.z-p.z)>2)){a.group.position.x=p.x;a.group.position.z=p.z;target=null;}
    a.target=p;
    }
    const sig=world.offerings.map(o=>o.id).join();
    if(sig!==offeringSignature){
      offeringSignature=sig;disposeGroup(offerings);offerings.clear();
      const tips:T.Vector3[]=[];
      world.offerings.forEach((o,i)=>{
        if(o.kind==='incense'){
          const a=i*2.4,r=.12+.105*Math.sqrt(i),x=Math.cos(a)*r,z=URN_Z+Math.sin(a)*r,h=.72+.12*Math.sin(i*3);
          cyl(.024,.19,'#a74230',x,ASH_HEIGHT+.095,z,offerings);
          cyl(.026,h,'#aa794d',x,ASH_HEIGHT+.19+h/2,z,offerings);
          const tip=ASH_HEIGHT+.19+h;
          cyl(.027,.06,'#ccc3b8',x,tip,z,offerings);
          const ember=ball(.035,'#ff6d30',x,tip+.03,z,offerings);
          const hot=ember.material as T.MeshStandardMaterial;hot.emissive.set('#ff591c');hot.emissiveIntensity=2;
          tips.push(new T.Vector3(x,tip+.055,z));
        }else{
          const x=i%2?-2.45:2.45;ball(.14,o.color,x+(i%3-1)*.12,1.85+(i%4)*.08,URN_Z-.12,offerings);
        }
      });
      smoke.setTips(tips);
    }
  }
  function pointerDown(e:PointerEvent){
    if(e.target!==renderer.domElement)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);
    dragging=true;lastX=startX=e.clientX;lastY=startY=e.clientY;
    if(pointers.size===1)movedPointer=false;
    else{movedPointer=true;const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);}
  }
  function pointerMove(e:PointerEvent){
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size>=2){const [a,b]=[...pointers.values()];const next=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0&&next>0)distance=clampDistance(distance*pinchDistance/next);pinchDistance=next;return;}
    if(!dragging)return;if(Math.hypot(e.clientX-startX,e.clientY-startY)>7)movedPointer=true;
    if(movedPointer){yaw-=(e.clientX-lastX)*.006;pitch=clampPitch(pitch+(e.clientY-lastY)*.006);}
    lastX=e.clientX;lastY=e.clientY;
  }
  function pointerUp(e:PointerEvent){
    if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
    if(pointers.size){const remaining=[...pointers.values()][0];lastX=startX=remaining.x;lastY=startY=remaining.y;movedPointer=true;return;}
    dragging=false;pinchDistance=0;if(movedPointer||!selfId)return;
    const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
    const point=new T.Vector3();if(ray.ray.intersectPlane(plane,point)&&walkable(point.x,point.z)){target=point;marker.position.set(point.x,groundHeight(point.x,point.z)+.07,point.z);marker.visible=true;}
  }
  function pointerCancel(){pointers.clear();dragging=false;movedPointer=true;pinchDistance=0;}
  function keyDown(e:KeyboardEvent){if((e.target as HTMLElement)?.matches('input,textarea,select'))return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());e.preventDefault();}}
  function keyUp(e:KeyboardEvent){keys.delete(e.key.toLowerCase());}const blur=()=>keys.clear();
  const wheel=(e:WheelEvent)=>{distance=clampDistance(distance+e.deltaY*.015);};
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerCancel);renderer.domElement.addEventListener('wheel',wheel,{passive:true});window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);
  const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(host);
  function animate(now:number){if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,0.05);last=now;
    for(const [id,a] of avatars){const p=a.target;const g=a.group;let walking=false;
      if(id===selfId&&p.action==='idle'){
        const dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);const dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
        if(dx||dz){target=g.position.clone().add(new T.Vector3(dx,0,dz).applyAxisAngle(new T.Vector3(0,1,0),yaw).normalize().multiplyScalar(1.2));}
        if(target){const delta=target.clone().sub(g.position);delta.y=0;const length=delta.length();if(length>0.12){delta.normalize();const step=Math.min(length,dt*4);const nx=g.position.x+delta.x*step,nz=g.position.z+delta.z*step;if(walkable(nx,nz)){g.position.x=nx;g.position.z=nz;g.rotation.y=Math.atan2(-delta.x,-delta.z);walking=true;}else target=null;}else{target=null;marker.visible=false;}}
        if((walking&&now-lastSend>70)||(!walking&&wasWalking)){onMove(g.position.x,g.position.z,g.rotation.y);lastSend=now;}wasWalking=walking;
      }else{walking=Math.hypot(g.position.x-p.x,g.position.z-p.z)>0.08;g.position.x=T.MathUtils.damp(g.position.x,p.x,14,dt);g.position.z=T.MathUtils.damp(g.position.z,p.z,14,dt);g.rotation.y=T.MathUtils.damp(g.rotation.y,p.yaw,12,dt);}
      g.position.y=groundHeight(g.position.x,g.position.z)+(p.seat>=0?.3:0);
      animateAvatar(a,p,walking,now/1000);
      a.name.material.opacity=p.connected?1:0.35;
    }
    smoke.update(now/1000);lanterns.update(Date.now());garden.update(now/1000);landscape.update(now/1000);sky.update(now/1000,camera.position);updateLighting();
    const me=avatars.get(selfId);const inside=!!me&&inHall(me.group.position.x,me.group.position.z);templeRoof.visible=!inside;
    const desired=overview?new T.Vector3(0,1.6,-4):me?new T.Vector3(me.group.position.x,me.group.position.y+1.6,me.group.position.z-2):look;
    look.lerp(desired,1-Math.exp(-dt*3));const orbit=cameraOrbit(overview?38:inside?distance*.72:distance,pitch);
    // Raise the sky view gently above nearby roofs instead of looking into their undersides.
    const skyLift=Math.max(0,-pitch)*12;
    const cp=new T.Vector3(look.x+Math.sin(yaw)*orbit.horizontal,look.y+orbit.height+skyLift,look.z+Math.cos(yaw)*orbit.horizontal);
    cp.y=Math.max(cp.y,groundHeight(cp.x,cp.z)+1.1);
    camera.position.lerp(cp,1-Math.exp(-dt*4));camera.lookAt(look.x,look.y+orbit.lookUp+skyLift,look.z);camera.updateMatrixWorld();
    for(const a of avatars.values()){
      bubblePosition.copy(a.group.position);bubblePosition.y+=3.15;bubblePosition.project(camera);
      const visible=Date.now()<a.speaksUntil&&bubblePosition.z<1&&bubblePosition.z>-1&&Math.abs(bubblePosition.x)<.95&&Math.abs(bubblePosition.y)<.9;
      a.bubble.hidden=!visible;if(visible){a.bubble.style.left=`${(bubblePosition.x*.5+.5)*host.clientWidth}px`;a.bubble.style.top=`${(-bubblePosition.y*.5+.5)*host.clientHeight}px`;}
    }
    renderer.render(scene,camera);
  }
  camera.position.set(0,25,34);frame=requestAnimationFrame(animate);
  function disposeGroup(group:T.Object3D){group.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}});}
  return {setWorld,setRain(value:boolean){raining=value;sky.setRain(value);},setNight(night:boolean,immediate=false){sky.setNight(night,immediate);},resetCamera(){yaw=0;pitch=.6;distance=22;},lookAtSky(){pitch=-.62;distance=8;},zoom(delta:number){distance=clampDistance(distance+delta);},dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);renderer.domElement.removeEventListener('webglcontextlost',onError);bubbleLayer.remove();halos.removeFromParent();pools.removeFromParent();pools.geometry.dispose();pools.dispose();poolMaterial.dispose();haloMaterial.dispose();glowTexture.dispose();disposeCenser();smoke.dispose();garden.dispose();landscape.dispose();lanterns.dispose();architecture.dispose();sky.dispose();disposeGroup(scene);art.dispose();mats.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();}};
}
