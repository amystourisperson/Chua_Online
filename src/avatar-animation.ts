import * as T from 'three';
import {WOOD_PERIOD_MS,type ActionId,type PlayerView} from './shared';
import type {createTempleArt} from './temple-art';
export type AvatarRig=ReturnType<ReturnType<typeof createTempleArt>['avatar']>;
const smooth=(a:number,b:number,t:number)=>{const v=T.MathUtils.clamp((t-a)/(b-a),0,1);return v*v*(3-2*v);};
export function ritualPose(action:ActionId,age:number){
  let kneel=0,fold=0;
  if(action==='bow'){
    kneel=smooth(0,.55,age)*(1-smooth(2.95,3.6,age));
    fold=smooth(.55,1.5,age)*(1-smooth(2.15,2.95,age));
  }
  const seated=['meditate','chant','beads','wood'].includes(action);
  return {hip:seated?.31:T.MathUtils.lerp(.65,.36,kneel),bend:-1.4*fold,kneel:kneel>.4,seated,fold};
}
const down=new T.Vector3(0,-1,0);
function reach(arm:AvatarRig['armL'],side:number,target:T.Vector3){
  const shoulder=arm.root.position,delta=target.clone().sub(shoulder);const length=T.MathUtils.clamp(delta.length(),.08,.625);const direction=delta.normalize();
  const along=(.33*.33-.3*.3+length*length)/(2*length),height=Math.sqrt(Math.max(0,.33*.33-along*along));
  const bend=new T.Vector3(side*.8,-.6,.05);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
  const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height);
  arm.root.quaternion.setFromUnitVectors(down,elbow.clone().sub(shoulder).normalize());
  const end=shoulder.clone().addScaledVector(direction,length).sub(elbow).normalize().applyQuaternion(arm.root.quaternion.clone().invert());
  arm.forearm.quaternion.setFromUnitVectors(down,end);
}
export function animateAvatar(a:AvatarRig,p:PlayerView,walking:boolean,time:number){
  const age=Math.max(0,(Date.now()-p.startedAt)/1000),pose=ritualPose(p.action,age);
  a.body.position.y=pose.hip+(walking?Math.sin(time*12)*.025:0);a.body.rotation.x=pose.bend;
  a.standing.visible=!pose.seated&&!pose.kneel;a.seated.visible=pose.seated;a.kneeling.visible=pose.kneel;
  a.legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(time*9+i*Math.PI)*.35:0);
  a.incense.visible=p.action==='incense';a.flowers.visible=p.action==='flower';a.beads.visible=p.action==='beads';a.mallet.visible=['wood','bell'].includes(p.action);a.wood.visible=p.action==='wood';
  let left=new T.Vector3(-.43,.64,walking?Math.sin(time*9)*.2:0),right=new T.Vector3(.43,.64,walking?-Math.sin(time*9)*.2:0);
  if(['bow','chant','incense','flower'].includes(p.action)){
    left.set(-.065,1.18,-.43);right.set(.065,1.18,-.43);
    if(p.action==='bow'&&pose.fold>0){
      // Convert floor-relative hand targets into the tilted torso frame.
      for(const [hand,side]of [[left,-1],[right,1]] as const){
        const onFloor=new T.Vector3(side*.28,.12-pose.hip,-.82).applyAxisAngle(new T.Vector3(1,0,0),-pose.bend);onFloor.y+=.65;hand.lerp(onFloor,pose.fold);
      }
    }
  }
  if(p.action==='meditate'){left.set(-.12,.78,-.36);right.set(.12,.78,-.36);}
  if(p.action==='beads'){left.set(-.1,.92,-.44);right.set(.18,.91+Math.sin(time*2)*.02,-.44);a.beads.rotation.z=Math.sin(time*2)*.025;}
  if(p.action==='wood'){
    const strike=Math.sin((age*1000%WOOD_PERIOD_MS)/WOOD_PERIOD_MS*Math.PI)**2;
    left.set(-.15,.8,-.35);right.set(.36,1.04-strike*.24,-.48-strike*.1);
  }
  if(p.action==='bell'){
    const strike=smooth(.12,.65,age)*(1-smooth(.72,1.5,age));
    left.set(-.12,1.13,-.35);right.set(.14,1.38,-.22-strike*.39);
  }
  if(p.action==='lantern'){const lift=smooth(.5,1.2,age)*(1-smooth(1.5,2.4,age));left.set(-.29,1.05+lift*.28,-.58);right.set(.29,1.05+lift*.28,-.58);}
  reach(a.armL,-1,left);reach(a.armR,1,right);
}
