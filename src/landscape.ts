import * as T from 'three';
import {createArchitecture} from './architecture';


export function createLandscape(scene:T.Scene){
  const architecture=createArchitecture();const staticRoot=new T.Group();scene.add(staticRoot);
  const materials=new Map<string,T.MeshStandardMaterial>();
  const mat=(color:string)=>{let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:.85});materials.set(color,m);}return m;};
  function mesh(p:T.Object3D,geo:T.BufferGeometry,c:string,x:number,y:number,z:number){const m=new T.Mesh(geo,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;p.add(m);return m;}
  const box=(w:number,h:number,d:number,c:string,x:number,y:number,z:number,p:T.Object3D=staticRoot)=>mesh(p,new T.BoxGeometry(w,h,d),c,x,y,z);
  const cyl=(r:number,h:number,c:string,x:number,y:number,z:number,p:T.Object3D=staticRoot)=>mesh(p,new T.CylinderGeometry(r,r,h,16),c,x,y,z);
  function stone(x:number,y:number,z:number,sx:number,sy:number,sz:number,c='#929b86',p:T.Object3D=staticRoot){const m=mesh(p,new T.IcosahedronGeometry(1,1),c,x,y,z);m.scale.set(sx,sy,sz);return m;}
  const roof=(x:number,y:number,z:number,w:number,d:number)=>architecture.roof(staticRoot,w,d,y,x,z);
  const lampPositions:T.Vector3[]=[];
  function lantern(x:number,z:number){
    lampPositions.push(new T.Vector3(x,1.92,z));
    cyl(.47,.18,'#828b79',x,.09,z);
    cyl(.33,.22,'#a0a38a',x,.27,z);
    cyl(.19,1.18,'#777f6b',x,.95,z);
    cyl(.45,.14,'#b0ab8b',x,1.56,z);
    box(.52,.66,.52,'#f0d9a0',x,1.92,z);
    for(const dx of [-.27,.27])for(const dz of [-.27,.27])box(.075,.7,.075,'#544d3e',x+dx,1.92,z+dz);
    const cap=mesh(staticRoot,new T.ConeGeometry(.75,.39,4),'#657365',x,2.43,z);
    cap.rotation.y=Math.PI/4;
    stone(x,2.69,z,.125,.17,.125,'#b99c58');
  }
  for(const [dx,dz] of [[-3.4,-2],[0,-3.95],[3.4,-2],[-3.4,2],[3.4,2]])lantern(10+dx,3+dz);
  // New wings are landscaped gardens, linked to the original courtyard by flagstone paths.
  for(const side of [-1,1]){
    box(16,.08,2.4,'#c6c3a9',side*22,-.03,12.5);
    for(let i=0;i<12;i++)box(1.1,.035,2.25,i%2?'#c0bda3':'#cec8ad',side*(15+i*1.18),.025,12.5);
    for(const z of [-7,-3,1,5,9,13])lantern(side*29,z);
    box(.4,.85,55,'#a4aa8d',side*31,.4,16);
    for(const z of [22,29,36]){
      const x=side*8;
      cyl(.28,3.4,'#795943',x,1.7,z);
      for(let j=0;j<6;j++){
        const a=j*2.4;
        const limb=cyl(.13,1.65,'#795943',x+Math.cos(a)*.45,3.25,z+Math.sin(a)*.45);
        limb.rotation.z=-Math.cos(a)*.65;limb.rotation.x=Math.sin(a)*.65;
        stone(x+Math.cos(a)*1.05,4.1+(j%3)*.38,z+Math.sin(a)*1.05,1.3,.88,1.25,j%2?'#e799ac':'#f3c1c6');
      }
      lantern(side*4.9,z);
    }
    box(23,.07,2.1,'#c6c3a9',side*15,-.015,20);
    box(2.1,.07,18,'#c6c3a9',side*25.5,-.015,28);
  }
  // Raked gravel around a group of standing stones in the western forecourt.
  cyl(5.5,.12,'#d7ceb7',-17,0,29);
  for(const r of [3.3,4.1,4.9]){
    const groove=mesh(staticRoot,new T.TorusGeometry(r,.045,5,56),'#b7ad96',-17,.075,29);
    groove.rotation.x=Math.PI/2;
  }
  for(const [dx,dz,h] of [[-.8,0,2.5],[1,.55,1.35],[.7,-1,1.1]]){
    const rock=stone(-17+dx,h*.62,29+dz,.95,h,.8,'#757f74');
    rock.rotation.z=dx*.14;
  }
  // An open vine pergola frames the view back toward the temple.
  for(const x of [14,19]){
    for(const z of [26,32])box(.32,3.6,.32,'#805c40',x,1.8,z);
    box(.38,.38,7.2,'#805c40',x,3.55,29);
  }
  for(let i=0;i<9;i++){
    const z=25.6+i*.85;
    box(6.1,.18,.22,'#9a7752',16.5,3.83,z);
    for(const x of [14,19]){
      stone(x,3.97,z,.9,.24,.62,'#5d8045');
      stone(x+.3*Math.sin(i),3.46,z,.18,.44,.2,i%2?'#ad92ba':'#c7abc9');
    }
  }
  // Waterfall and reflecting pool in the western garden.
  const pool=cyl(4.4,.12,'#25898b',-24,.015,4);pool.scale.z=.82;
  for(let i=0;i<28;i++){const a=i*Math.PI/14;if(Math.sin(a)<-.85&&Math.cos(a)<.15)continue;stone(-24+Math.cos(a)*4.6,.16,4+Math.sin(a)*3.8,.52,.3,.45);}
  // A continuous rock face supports the upper basin. Leave the falling water corridor open.
  for(const [x,y,z,sx,sy,sz]of [
    [-26,1.1,-1.25,1.8,1.4,1.35],[-24.5,1.1,-1.25,1.6,1.4,1.3],
    [-25.8,2.7,-1.3,1.6,1.5,1.2],[-24.5,3.4,-1.3,1.3,1.25,1.1],
    [-27,1.2,-.05,.8,1.5,.8],[-27,3,-.1,.75,1.25,.75],
    [-22.9,1.4,-.1,.75,1.7,.75],[-23.1,3.1,-.2,.7,1.15,.7],
  ])stone(x,y,z,sx,sy,sz,'#8d9989');
  // The spring basin opens toward +Z; water spills over a visible stone lip into the pool.
  box(2.3,.25,2.5,'#8d9989',-25,4.3,-.65);
  box(1.7,.045,2.35,'#85b6b2',-25,4.455,-.62);
  for(const x of [-26.1,-23.9])for(const z of [-1.5,-.7,.1])stone(x,4.55,z,.3,.28,.43,'#a5ad99');
  for(const x of [-25.7,-25,-24.3])stone(x,4.55,-1.9,.43,.3,.3,'#a5ad99');
  // Shallow run-off visibly connects the cascade foot to the main pond, without an edge blocking it.
  box(1.8,.05,1.8,'#86bbb4',-25,.1,1.35);
  for(let i=0;i<14;i++){const a=i*.42;stone(-24+Math.cos(a)*5.7,.07,4+Math.sin(a)*4.7,.4,.08,.32,'#c3c0a6');}
  for(const x of [-27.4,-20.6]){box(2.3,.16,.6,'#927959',x,.58,10);for(const dx of [-.8,.8])box(.15,.5,.45,'#6d6652',x+dx,.27,10);}
  // Open bell pavilion; floor stays level with the walking surface.
  box(6.6,.1,5.6,'#bba16a',-22,0,-5);
  for(const x of [-24.7,-19.3])for(const z of [-7.2,-2.8]){cyl(.29,5,'#982a20',x,2.5,z);cyl(.43,.18,'#b9a477',x,.1,z);}
  box(3.5,1.4,2.6,'#74231a',-22,6.3,-5);roof(-22,5.45,-5,7.5,6.6);roof(-22,7,-5,5.1,4.2);box(5.5,.3,.4,'#70271d',-22,4.7,-5);
  for(const x of [-24,-20])architecture.hang(staticRoot,x,4.8,-2.8,.5);
  cyl(.055,1.9,'#ba9135',-22,3.8,-5);
  const bellRig=new T.Group();bellRig.position.set(-22,2.85,-5);scene.add(bellRig);let bellStartedAt=0;
  mesh(bellRig,new T.LatheGeometry([[.72,0],[.73,.1],[.62,.18],[.53,1.1],[.35,1.4],[.1,1.5]].map(([r,y])=>new T.Vector2(r,y)),40),'#b49a59',0,-1.55,0);
  for(const y of [1.4,1.65,2.1]){const ring=mesh(bellRig,new T.TorusGeometry(y<1.7?.64:.54,.03,8,40),'#d2b76b',0,y-2.85,0);ring.rotation.x=Math.PI/2;}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;cyl(.03,.5,'#877540',Math.cos(a)*.53,-.75,Math.sin(a)*.53,bellRig);}
  // East-side tea pavilion, circular gravel garden and flowering trees.
  cyl(5,.08,'#bfa574',22,0,6.2);
  for(const x of [18.7,25.3])for(const z of [2.8,9.6]){cyl(.27,5.2,'#982a20',x,2.6,z);cyl(.43,.14,'#c8b185',x,.08,z);}
  roof(22,5.7,6.2,8.4,8.2);for(const x of [19.5,22,24.5])architecture.hang(staticRoot,x,5,9.6,.48);
  cyl(.9,.13,'#b69c72',22,.9,5.5);cyl(.18,.85,'#927d5a',22,.43,5.5);
  for(const x of [20.4,23.6]){cyl(.43,.55,'#97825c',x,.28,5.5);cyl(.48,.1,'#c2b18c',x,.6,5.5);}
  for(const x of [19.5,24.5]){box(.2,.75,3,'#957c5b',x,.45,6.2);box(.3,.12,3.2,'#bea67d',x,.88,6.2);}
  for(const [x,z]of [[18,10],[27,9],[27,-1],[-18,-8],[-28,11]]){
    cyl(.18,2.5,'#88745c',x,1.25,z);
    for(let i=0;i<7;i++){const a=i*2.4;stone(x+Math.cos(a)*.85,2.8+(i%3)*.35,z+Math.sin(a)*.75,1,.65,.9,i%2?'#d47a96':'#f0a8ba');}
  }
  // Bamboo grove with a clear winding central trail.
  for(let i=0;i<44;i++){
    const side=i%2?-1:1,x=22+side*(1.8+(i*7%34)/10),z=-9+(i*11%110)/10,h=3.3+i%4*.48;
    cyl(.055,h,'#407b38',x,h/2,z);
    for(let j=1;j<6;j++){
      cyl(.067,.045,'#bbc595',x,j*h/6,z);
      const leaf=stone(x+side*.3,j*h/6+.3,z,.4,.055,.13,j%2?'#2e6933':'#6b9e3d');leaf.rotation.z=side*.42;
    }
  }
  for(let i=0;i<13;i++)stone(22+Math.sin(i*.7)*.55,.05,-9+i*.78,.55,.065,.38,'#bfbfa5');
  for(const z of [0,10])for(const x of [16.5,28])lantern(x,z);
  // A lantern court opens toward the sky, outside the roofs and tree canopy.
  cyl(2.6,.1,'#ad754b',17,.02,13);cyl(2.3,.025,'#d1a958',17,.085,13);
  for(const x of [14.3,19.7]){cyl(.12,3.8,'#6b2c20',x,1.9,14.5);box(1.1,.12,.16,'#d0a13e',x,3.7,14.5);architecture.hang(staticRoot,x,3.65,14.5,.5);}
  // Distant hills make the horizon visible from a low camera.
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2;if(Math.cos(a)>.75)continue;const hill=mesh(staticRoot,new T.ConeGeometry(14,18+i%3*7,7),'#63886e',Math.sin(a)*76,5,Math.cos(a)*66);hill.scale.z=1.7;hill.castShadow=false;}
  const waterMaterial=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,uniforms:{time:{value:0},night:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform float night;
    void main(){float flow=sin(vUv.y*45.+time*6.+sin(vUv.x*25.)*2.);float strand=pow(abs(sin(vUv.x*34.)),8.);vec3 c=mix(vec3(.47,.73,.74),vec3(.9,.97,.92),strand*.6+flow*.12+.2);gl_FragColor=vec4(c*mix(vec3(1.),vec3(.32,.46,.65),night),.76);}`});
  const falls=new T.Mesh(new T.PlaneGeometry(1.65,4.25),waterMaterial);falls.position.set(-25,2.325,.57);scene.add(falls);
  const foamGeometry=new T.SphereGeometry(.13,8,6),foamMaterial=new T.MeshBasicMaterial({color:'#e1efe4',transparent:true,opacity:.6,depthWrite:false});
  const foam=new T.InstancedMesh(foamGeometry,foamMaterial,25);foam.frustumCulled=false;scene.add(foam);const dummy=new T.Object3D();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {staticRoot,lampPositions,falls,setNight(blend:number){architecture.setNight(blend);waterMaterial.uniforms.night.value=blend;foamMaterial.color.set('#e1efe4').lerp(new T.Color('#7897b7'),blend);const lamp=materials.get('#f0d9a0');if(lamp){lamp.emissive.set('#ffc16d');lamp.emissiveIntensity=.16+blend*2.7;}},ringBell(startedAt:number){bellStartedAt=Math.max(bellStartedAt,startedAt);},update(now:number){const t=reduced?0:now;waterMaterial.uniforms.time.value=t;
    const bellAge=(Date.now()-bellStartedAt-650)/1000;bellRig.rotation.x=bellAge>=0&&bellAge<4?Math.sin(bellAge*14)*.038*Math.exp(-bellAge*1.5):0;
    for(let i=0;i<25;i++){dummy.position.set(-25+Math.sin(i*7.1)*.95,.18+Math.abs(Math.sin(t*1.8+i))*.2, .8+(t*.45+i*.17)%1.5);dummy.scale.set(1.5,.35,1);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix);}foam.instanceMatrix.needsUpdate=true;
  },dispose(){architecture.dispose();waterMaterial.dispose();foamMaterial.dispose();materials.forEach(m=>m.dispose());}};
}
