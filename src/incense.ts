import * as T from 'three';

export const ASH_HEIGHT=1.46;
export const URN_Z=-1.1;

export function createCenser(scene:T.Scene){
  const bronze=new T.MeshStandardMaterial({color:'#82603c',metalness:.48,roughness:.4});
  const edge=new T.MeshStandardMaterial({color:'#ba9356',metalness:.52,roughness:.32});
  const stone=new T.MeshStandardMaterial({color:'#aca595',roughness:.94});
  const ash=new T.MeshStandardMaterial({color:'#aaa397',roughness:1});
  const group=new T.Group();group.position.z=URN_Z;scene.add(group);
  function add(geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){
    const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  function turned(profile:number[][],material:T.Material){
    return add(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),56),material);
  }
  function band(radius:number,y:number,width:number){
    add(new T.TorusGeometry(radius,width,8,56),edge,0,y).rotation.x=Math.PI/2;
  }
  turned([[.02,.02],[1.42,.02],[1.42,.13],[1.31,.18],[1.27,.27],[1.32,.31],[.02,.31]],stone);
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3;
    const foot=add(new T.SphereGeometry(1,14,10),bronze,Math.sin(a)*.59,.49,Math.cos(a)*.59);
    foot.scale.set(.17,.26,.18);
  }
  turned([[.01,.57],[.48,.57],[.72,.66],[.92,.83],[1.01,1.04],[1,1.2],[.89,1.32],[.94,1.39],[1.05,1.43],[1.06,1.53],[.88,1.53],[.85,1.4],[.02,1.33]],bronze);
  band(1.04,1.51,.035);band(1,1.15,.024);band(.982,.99,.026);
  for(const side of [-1,1]){
    const path=new T.CatmullRomCurve3([[.9,1.05],[1.23,1.12],[1.43,1.42],[1.37,1.65],[1.24,1.68],[1.18,1.57],[1.24,1.5]].map(([x,y])=>new T.Vector3(side*x,y,0)));
    add(new T.TubeGeometry(path,32,.072,10,false),edge);
  }
  add(new T.CylinderGeometry(.887,.85,.07,56),ash,0,ASH_HEIGHT-.035);
  for(let i=0;i<54;i++){
    const a=i*2.4,r=.84*Math.sqrt((i+.5)/54);
    const grain=add(new T.IcosahedronGeometry(.029,0),stone,r*Math.cos(a),ASH_HEIGHT,r*Math.sin(a));
    grain.scale.set(1,.35,.7);
  }
  // Raised lotus petals around the belly of the cast bronze vessel.
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12;
    const petal=add(new T.SphereGeometry(1,8,8),edge,.922*Math.sin(a),.87,.922*Math.cos(a));
    petal.rotation.y=a;petal.scale.set(.066,.115,.025);
  }
  return ()=>[bronze,edge,stone,ash].forEach(m=>m.dispose());
}

export function createSmoke(scene:T.Scene){
  const layers=14,geometry=new T.InstancedBufferGeometry();
  const quad=new T.PlaneGeometry();geometry.index=quad.index;geometry.setAttribute('position',quad.attributes.position);
  geometry.setAttribute('uv',quad.attributes.uv);
  const origins=new T.InstancedBufferAttribute(new Float32Array(20*layers*3),3);
  const phases=new T.InstancedBufferAttribute(Float32Array.from({length:20*layers},(_,i)=>(i%layers)/layers+Math.floor(i/layers)*.139),1);
  geometry.setAttribute('origin',origins);geometry.setAttribute('phase',phases);geometry.instanceCount=0;
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},
    vertexShader:`attribute vec3 origin;attribute float phase;uniform float time;varying vec2 uvSmoke;varying float age;
    void main(){
      age=fract(time*.24+phase);uvSmoke=uv;
      vec3 p=origin+vec3(.36*age+sin(age*8.+origin.x*8.+time*.65)*age*.24,age*2.35,cos(age*6.+origin.z*9.+time*.4)*age*.19);
      vec4 mv=viewMatrix*vec4(p,1.);mv.xy+=position.xy*vec2(.095+.62*age,.22+.65*age);
      gl_Position=projectionMatrix*mv;
    }`,
    fragmentShader:`varying vec2 uvSmoke;varying float age;
    void main(){vec2 q=2.*uvSmoke-1.;float density=pow(max(0.,1.-dot(q,q)),2.);
      gl_FragColor=vec4(.83,.84,.82,density*.49*(1.-age)*smoothstep(0.,.06,age));}`});
  const mist=new T.Mesh(geometry,material);mist.frustumCulled=false;scene.add(mist);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {setTips(tips:T.Vector3[]){
    let count=0;
    for(const tip of tips)for(let j=0;j<layers;j++)origins.setXYZ(count++,tip.x,tip.y,tip.z);
    origins.needsUpdate=true;geometry.instanceCount=count;
  },update(time:number){material.uniforms.time.value=reduced?0:time;},
  dispose(){mist.removeFromParent();geometry.dispose();quad.dispose();material.dispose();}};
}
