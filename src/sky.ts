import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** A personal sky setting. It never changes another visitor's environment. */
export function createSky(scene:T.Scene,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches){
  const root=new T.Group();scene.add(root);
  let blend=0,target=0,lastTime:number|undefined,nightStart=0;
  const dayTop=new T.Color('#78b5d8'),dayBottom=new T.Color('#e3e9d7');
  const nightTop=new T.Color('#060e29'),nightBottom=new T.Color('#263b60');
  const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:dayTop.clone()},bottom:{value:dayBottom.clone()}},vertexShader:'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vPos;uniform vec3 top;uniform vec3 bottom;void main(){float h=pow(max(normalize(vPos).y,0.),.55);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
  const dome=new T.Mesh(new T.SphereGeometry(230,32,20),skyMaterial);dome.renderOrder=-10;root.add(dome);
  const sunMaterial=new T.MeshBasicMaterial({color:'#fff2c5',fog:false,transparent:true});
  const sun=new T.Mesh(new T.SphereGeometry(5.3,24,16),sunMaterial);sun.position.set(-70,75,-110);root.add(sun);
  // The moon is an illuminated disc with subtle maria, facing the centre of the map.
  const moon=new T.Group();moon.name='moon';moon.position.set(-65,90,-110);moon.lookAt(0,5,0);root.add(moon);
  const moonMaterial=new T.MeshBasicMaterial({color:'#fff2d4',fog:false,transparent:true});
  moon.add(new T.Mesh(new T.CircleGeometry(5.8,48),moonMaterial));
  const craterMaterial=new T.MeshBasicMaterial({color:'#bbbdb9',fog:false,transparent:true,opacity:.2,depthWrite:false});
  for(const [x,y,r] of [[-1.8,1.5,1.5],[1.6,-1.8,1.2],[2.4,1.2,.8],[-1,-2.8,.65],[-.3,.1,.5]]){
    const crater=new T.Mesh(new T.CircleGeometry(r,20),craterMaterial);crater.position.set(x,y,.03);crater.scale.y=.75;moon.add(crater);
  }
  const glowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{opacity:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float opacity;void main(){float r=length(vUv-.5)*2.;float a=pow(max(0.,1.-r),3.)*.24*opacity;gl_FragColor=vec4(.62,.73,1.,a);}'});
  const glow=new T.Mesh(new T.PlaneGeometry(25,25),glowMaterial);glow.position.z=-.05;moon.add(glow);
  // Seeded upper-hemisphere stars: one GPU draw, no textures or downloads.
  let seed=721;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const positions:number[]=[],phases:number[]=[],sizes:number[]=[];
  for(let i=0;i<650;i++){const y=.08+random()*.9,a=random()*Math.PI*2,r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*205,y*205,Math.sin(a)*r*205);phases.push(random()*6.28);sizes.push(1.5+random()*2.2);}
  const starGeometry=new T.BufferGeometry();starGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));starGeometry.setAttribute('phase',new T.Float32BufferAttribute(phases,1));starGeometry.setAttribute('size',new T.Float32BufferAttribute(sizes,1));
  const starMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{night:{value:0},time:{value:0}},vertexShader:'attribute float phase;attribute float size;varying float vPhase;void main(){vPhase=phase;gl_PointSize=size;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float night;uniform float time;varying float vPhase;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.15,1.,d))*night*(.7+.3*sin(time*.8+vPhase));gl_FragColor=vec4(.82,.9,1.,a);}'});
  const stars=new T.Points(starGeometry,starMaterial);stars.name='stars';root.add(stars);
  const cloudMaterial=new T.MeshLambertMaterial({color:'#fff9ec',transparent:true,depthWrite:false});const clouds:T.Group[]=[];
  for(let i=0;i<9;i++){
    const g=new T.Group(),parts:T.BufferGeometry[]=[];
    for(let j=0;j<5;j++){const geo=new T.SphereGeometry(1,12,8);geo.scale(4.4+j%2,1.5+j%3*.6,2.1);geo.translate((j-2)*3,Math.sin(j*2)*.6,Math.cos(j)*1.3);parts.push(geo);}
    const geometry=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());g.add(new T.Mesh(geometry,cloudMaterial));const a=i*Math.PI*2/9;g.position.set(Math.sin(a)*85,60+i%3*18,Math.cos(a)*85);g.rotation.y=a;g.userData.baseX=g.position.x;root.add(g);clouds.push(g);
  }
  // Each streak has a soft blue halo, a white core and a rounded leading edge.
  const streakGeometry=new T.PlaneGeometry(34,3.8);
  streakGeometry.translate(-16,0,0);
  const meteors=Array.from({length:2},(_,i)=>{
    const material=new T.ShaderMaterial({
      side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      uniforms:{opacity:{value:0}},
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv; uniform float opacity;
        void main(){
          float width=mix(.12,.95,vUv.x);
          float d=abs(vUv.y*2.-1.)/width;
          float tip=1.-smoothstep(.965,1.,vUv.x);
          float core=exp(-12.*d*d);
          float glow=exp(-3.*d*d);
          gl_FragColor=vec4(mix(vec3(.38,.69,1.),vec3(1.,.98,.88),core),
                            opacity*tip*vUv.x*(core+.65*glow));
        }`
    });
    const track=new T.Group();root.add(track);
    const streak=new T.Mesh(streakGeometry,material);
    streak.name=i===0?'meteor':'meteor-secondary';track.add(streak);
    return {track,streak,cycle:-1};
  });
  let raining=false;
  const rainTop=new T.Color('#718493'),rainHorizon=new T.Color('#b4c2c3');
  const rainyNight=new T.Color('#15223a');
  const drops:number[]=[];
  for(let i=0;i<850;i++){
    const x=random()*44,y=random()*24,z=random()*44;
    drops.push(x,y,z,x+.065,y+.55,z);
  }
  const rainGeometry=new T.BufferGeometry();
  rainGeometry.setAttribute('position',new T.Float32BufferAttribute(drops,3));
  const rainMaterial=new T.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{time:{value:0},eye:{value:new T.Vector3()},opacity:{value:.5}},
    vertexShader:`uniform float time;uniform vec3 eye;varying float alpha;
      void main(){
        float tip=mod(float(gl_VertexID),2.);
        vec3 seed=position-tip*vec3(.065,.55,0.);
        vec3 p=vec3(mod(seed.x-eye.x-time*1.2,44.)+eye.x-22.,
                    mod(seed.y-time*11.,24.)+max(0.,eye.y-12.),
                    mod(seed.z-eye.z,44.)+eye.z-22.);
        bool shelter=(abs(p.x)<11.4 && abs(p.z+11.)<6.8 && p.y<9.)
          || (abs(p.x-22.)<4.2 && abs(p.z-6.2)<4.1 && p.y<5.7)
          || (abs(p.x+22.)<3.75 && abs(p.z+5.)<3.3 && p.y<5.45);
        alpha=shelter?0.:1.-smoothstep(14.,22.,length(p.xz-eye.xz));
        gl_Position=projectionMatrix*viewMatrix*vec4(p+tip*vec3(.065,.55,0.),1.);
      }`,
    fragmentShader:'varying float alpha;uniform float opacity;void main(){gl_FragColor=vec4(.69,.82,.9,alpha*opacity);}'
  });
  const rain=new T.LineSegments(rainGeometry,rainMaterial);rain.name='rain';rain.frustumCulled=false;root.add(rain);
  function update(t:number,eye?:T.Vector3){
    const dt=lastTime===undefined?0:Math.max(0,Math.min(t-lastTime,.1));lastTime=t;
    blend=reduced?target:T.MathUtils.damp(blend,target,2.4,dt);if(Math.abs(blend-target)<.001)blend=target;
    skyMaterial.uniforms.top.value.copy(dayTop).lerp(nightTop,blend);skyMaterial.uniforms.bottom.value.copy(dayBottom).lerp(nightBottom,blend);
    rain.visible=raining&&!reduced;
    if(raining){
      skyMaterial.uniforms.top.value.lerp(blend>.5?rainyNight:rainTop,.65);
      skyMaterial.uniforms.bottom.value.lerp(blend>.5?rainyNight:rainHorizon,.7);
      rainMaterial.uniforms.time.value=t;
      if(eye)rainMaterial.uniforms.eye.value.copy(eye);
    }
    sun.visible=!raining&&blend<.999;sunMaterial.opacity=1-blend;moon.visible=blend>.001;moonMaterial.opacity=blend;craterMaterial.opacity=blend*.2;glowMaterial.uniforms.opacity.value=blend;
    stars.visible=blend>.001;starMaterial.uniforms.night.value=blend;starMaterial.uniforms.time.value=reduced?0:t;
    cloudMaterial.color.set('#fff9ec').lerp(new T.Color('#7186b4'),blend);cloudMaterial.opacity=1-blend*.68;
    if(!reduced)clouds.forEach((g,i)=>g.position.x=g.userData.baseX+Math.sin(t*.012+i)*9);
    const elapsed=Math.max(0,t-nightStart);
    meteors.forEach((m,i)=>{
      const local=elapsed-.45-i*1.35,cycle=Math.floor(local/2.7),age=local-cycle*2.7;
      m.streak.visible=!reduced&&target===1&&blend>.4&&local>=0&&age<1.75;
      if(!m.streak.visible)return;
      if(m.cycle!==cycle){
        m.cycle=cycle;

        if(eye)m.track.position.copy(eye);
      }

      m.streak.position.set(-45+age*46+10*Math.sin(cycle+i),98+10*Math.sin(cycle*2+i)-age*17,-124);
      m.streak.rotation.set(0,0,-.354,'YXZ');
      m.streak.material.uniforms.opacity.value=blend*Math.min(1,age/.14,(1.75-age)/.32);
    });
  }
  update(0);
  return {setRain(value:boolean){raining=value;},get nightBlend(){return blend;},setNight(night:boolean,immediate=false){target=night?1:0;nightStart=lastTime??0;meteors.forEach(m=>m.cycle=-1);if(immediate)blend=target;},update,dispose(){root.removeFromParent();rainGeometry.dispose();rainMaterial.dispose();const materials=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>m.dispose());}};
}
