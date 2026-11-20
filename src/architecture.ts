import * as T from 'three';

/** Shared materials keep the detailed roofs batchable. Dimensions are in world metres. */
export function createArchitecture(){
  const red=new T.MeshStandardMaterial({color:'#9f241d',roughness:.66});
  const tile=new T.MeshStandardMaterial({color:'#c54928',roughness:.72});
  const gold=new T.MeshStandardMaterial({color:'#d6a544',metalness:.48,roughness:.36});
  const wood=new T.MeshStandardMaterial({color:'#51221c',roughness:.72});
  const paper=new T.MeshStandardMaterial({color:'#d92719',emissive:'#ff651c',emissiveIntensity:.18,roughness:.6});
  const all=[red,tile,gold,wood,paper];
  function mesh(p:T.Object3D,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function line(p:T.Object3D,points:T.Vector3[],r:number,m:T.Material){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points),20,r,5,false),m);}
  function roof(p:T.Object3D,w:number,d:number,y:number,x=0,z=0){
    const group=new T.Group();group.position.set(x,y,z);p.add(group);
    const point=(u:number,t:number,side:number)=>new T.Vector3(u*w*.5*(.86+.14*t),.85-2*t+.65*t**5+.42*Math.abs(u)**5*t,side*t*d*.5);
    for(const side of [-1,1]){
      const pos:number[]=[],uv:number[]=[],indices:number[]=[];const nx=24,nt=12;
      for(let j=0;j<=nt;j++)for(let i=0;i<=nx;i++){pos.push(...point(i/nx*2-1,j/nt,side).toArray());uv.push(i/nx,j/nt);}
      for(let j=0;j<nt;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
      mesh(group,geometry,red);red.side=T.DoubleSide;
      for(let i=0;i<=Math.ceil(w/.38);i++)line(group,Array.from({length:10},(_,j)=>point(i/Math.ceil(w/.38)*2-1,j/9,side).add(new T.Vector3(0,.05,0))),.045,tile);
      line(group,Array.from({length:15},(_,i)=>point(i/14*2-1,1,side)),.12,gold);
      for(const u of [-1,1])line(group,Array.from({length:12},(_,i)=>point(u,i/11,side)),.11,gold);
    }
    line(group,[new T.Vector3(-w*.46,1.4,0),new T.Vector3(-w*.38,.98,0),new T.Vector3(0,1.03,0),new T.Vector3(w*.38,.98,0),new T.Vector3(w*.46,1.4,0)],.13,gold);
    mesh(group,new T.SphereGeometry(.3,16,12),gold,0,1.34,0);
    for(const side of [-1,1])mesh(group,new T.BoxGeometry(w*.86,.36,.28),wood,0,-.45,side*d*.38);
    return group;
  }
  function hang(p:T.Object3D,x:number,ceiling:number,z:number,size=.55){
    const group=new T.Group();group.position.set(x,ceiling,z);p.add(group);
    mesh(group,new T.CylinderGeometry(.023,.023,.48,6),gold,0,-.24,0);
    const globe=mesh(group,new T.SphereGeometry(size,16,12),paper,0,-.48-size*.9,0);globe.scale.y=1.1;
    for(const sign of [-1,1])mesh(group,new T.CylinderGeometry(size*.48,size*.48,.1,16),gold,0,-.48-size*.9+sign*size,0);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;line(group,Array.from({length:9},(_,j)=>{const v=j/8*Math.PI;return new T.Vector3(Math.cos(a)*Math.sin(v)*size*1.01,-.48-size*.9+Math.cos(v)*size*1.1,Math.sin(a)*Math.sin(v)*size*1.01);}),.012,gold);}
    mesh(group,new T.CylinderGeometry(.06,.09,.4,8),red,0,-.48-size*2-.22,0);
    return group;
  }
  function pagoda(p:T.Object3D,x:number,z:number){
    const g=new T.Group();g.position.set(x,0,z);p.add(g);
    mesh(g,new T.CylinderGeometry(2,2.2,.4,8),gold,0,.2,0);
    for(let i=0;i<3;i++){const w=2.9-i*.48,y=.4+i*2;mesh(g,new T.BoxGeometry(w,1.7,w),wood,0,y+.85,0);for(const side of [-1,1]){mesh(g,new T.BoxGeometry(w*.58,1.1,.06),red,0,y+.85,side*(w/2+.04));for(const dx of [-.28,.28])mesh(g,new T.BoxGeometry(.08,.9,.08),gold,dx,y+.85,side*(w/2+.09));}roof(g,w+1.25,w+1.25,y+1.75);}
    mesh(g,new T.ConeGeometry(.2,1.3,12),gold,0,7.8,0);return g;
  }
  return {roof,hang,pagoda,setNight(n:number){paper.emissiveIntensity=.32+n*2.4;},dispose(){all.forEach(m=>m.dispose());}};
}
