import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {LANTERN_LIMIT,type LanternView} from './shared';

export function lanternPosition(l:LanternView,now:number,reduced=false){
  const age=Math.max(0,(now-l.releasedAt)/1000);
  const spread=Math.min(age/2,1)*1.35;
  const angle=Number(l.id)*2.4;
  const sway=reduced?0:Math.sin(age*.7+Number(l.id))*.18*Math.min(age/3,1);
  return {x:l.x+age*.055+sway+Math.cos(angle)*spread,y:1.03+age*.85,z:l.z+age*.08+Math.sin(angle)*spread,scale:Math.max(0,Math.min(1,(l.expiresAt-now)/4500)),visible:now<l.expiresAt};
}
/** Three instanced draws for every released lantern, regardless of the number of visitors. */
export function createLanterns(scene:T.Scene,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches){
  const paperGeometry=new T.LatheGeometry([[.27,0],[.36,.12],[.45,.45],[.47,.85],[.4,1.1],[.32,1.2]].map(([r,y])=>new T.Vector2(r,y)),16);
  const parts:T.BufferGeometry[]=[];
  for(const [r,y]of [[.28,.015],[.33,1.19]]){const g=new T.TorusGeometry(r,.025,6,20);g.rotateX(Math.PI/2);g.translate(0,y,0);parts.push(g);}
  for(let i=0;i<6;i++){const a=i*Math.PI/3;parts.push(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(Math.cos(a)*.28,0,Math.sin(a)*.28),new T.Vector3(Math.cos(a)*.465,.6,Math.sin(a)*.465),new T.Vector3(Math.cos(a)*.33,1.19,Math.sin(a)*.33)]),10,.012,4,false));}
  const frameGeometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
  const flameGeometry=new T.SphereGeometry(.12,10,8);flameGeometry.scale(.65,1.5,.65);flameGeometry.translate(0,.09,0);
  const paper=new T.MeshStandardMaterial({color:'#ffffff',emissive:'#ff9b37',emissiveIntensity:.35,roughness:.65,side:T.DoubleSide});
  const frame=new T.MeshStandardMaterial({color:'#a96d26',metalness:.2,roughness:.6});const flame=new T.MeshBasicMaterial({color:'#ffe6a3'});
  const meshes=[new T.InstancedMesh(paperGeometry,paper,LANTERN_LIMIT),new T.InstancedMesh(frameGeometry,frame,LANTERN_LIMIT),new T.InstancedMesh(flameGeometry,flame,LANTERN_LIMIT)];
  meshes.forEach(m=>{m.count=0;m.frustumCulled=false;scene.add(m);});
  let lanterns:LanternView[]=[];const dummy=new T.Object3D(),color=new T.Color();
  return {setWorld(next:LanternView[]){lanterns=next.slice(0,LANTERN_LIMIT);},setNight(n:number){paper.emissiveIntensity=.25+n*.9;},update(now:number){
    let count=0;for(const l of lanterns){const p=lanternPosition(l,now,reduced);if(!p.visible)continue;dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(p.scale);dummy.rotation.set(0,reduced?0:Math.sin((now-l.releasedAt)/5000)*.1,0);dummy.updateMatrix();for(const m of meshes)m.setMatrixAt(count,dummy.matrix);meshes[0].setColorAt(count,color.set(l.color));count++;}
    meshes.forEach(m=>{m.count=count;m.instanceMatrix.needsUpdate=true;});if(meshes[0].instanceColor)meshes[0].instanceColor.needsUpdate=true;
  },dispose(){meshes.forEach(m=>{scene.remove(m);m.geometry.dispose();m.dispose();});paper.dispose();frame.dispose();flame.dispose();}};
}
