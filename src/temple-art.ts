import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {PlayerView} from './shared';

// All models are original procedural geometry; no external model downloads.
export function createTempleArt(){
  const materials=new Map<string,T.MeshStandardMaterial>();
  function material(color:string){let m=materials.get(color);if(!m){m=new T.MeshStandardMaterial({color,roughness:color==='#c6a461'?.42:.78,metalness:color==='#c6a461'?.32:0});materials.set(color,m);}return m;}
  function mesh(parent:T.Object3D,geo:T.BufferGeometry,color:string,x=0,y=0,z=0){const m=new T.Mesh(geo,material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function ellipsoid(p:T.Object3D,c:string,x:number,y:number,z:number,sx:number,sy:number,sz:number){const m=mesh(p,new T.SphereGeometry(1,24,16),c,x,y,z);m.scale.set(sx,sy,sz);return m;}
  function tube(p:T.Object3D,c:string,points:number[][],r=.018){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v as [number,number,number]))),24,r,5,false),c);}
  function robe(p:T.Object3D,c:string,profile:number[][],zScale=1){const m=mesh(p,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),40),c);m.scale.z=zScale;return m;}
  function bake(root:T.Object3D,excluded:T.Object3D[]=[]){
    root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert();const buckets=new Map<T.Material,T.Mesh[]>();
    root.traverse(o=>{if(!(o instanceof T.Mesh))return;let a:T.Object3D|null=o;while(a){if(excluded.includes(a))return;a=a.parent;}const m=o.material as T.Material;buckets.set(m,[...(buckets.get(m)??[]),o]);});
    for(const [mat,objects]of buckets){const pieces=objects.map(o=>o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld)));const geo=mergeGeometries(pieces);pieces.forEach(p=>p.dispose());if(!geo)continue;objects.forEach(o=>{o.geometry.dispose();o.removeFromParent();});const m=new T.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;root.add(m);}
  }
  function avatar(p:PlayerView){
    const group=new T.Group(),body=new T.Group(),upper=new T.Group();group.add(body);body.position.y=.65;body.add(upper);upper.position.y=-.65;
    const standing=new T.Group(),seated=new T.Group(),kneeling=new T.Group();group.add(standing,seated,kneeling);
    const skin='#e5bc92',dark='#3c3935',trim=new T.Color(p.color).multiplyScalar(.73).getStyle();
    const long=p.outfit!=='lam';
    const legs=[-1,1].map(side=>{const leg=new T.Group();standing.add(leg);leg.position.set(side*.19,.6,0);
      ellipsoid(leg,'#4c5047',0,-.5,-.08,.17,.1,.25);
      robe(leg,'#e2dfcd',[[.14,-.47],[.16,-.36],[.15,.04]]);bake(leg);return leg;});
    if(long)robe(standing,p.color,[[.48,.15],[.52,.2],[.49,.27],[.43,.61],[.41,.7]],.82);
    for(const side of [-1,1]){
      const knee=ellipsoid(seated,p.color,side*.23,.16,-.05,.37,.16,.29);knee.rotation.y=side*.35;
      ellipsoid(seated,'#e2dfcd',side*.17,.12,-.28,.19,.095,.14);
      ellipsoid(kneeling,p.color,side*.22,.18,.07,.21,.18,.38);
      ellipsoid(kneeling,'#4c5047',side*.2,.09,.38,.13,.08,.15);
    }
    seated.visible=kneeling.visible=false;bake(seated);bake(kneeling);bake(standing,legs);
    robe(upper,p.color,[[.4,.57],[.42,.63],[.38,.82],[.34,1.22],[.26,1.38],[.12,1.4]],.82);
    for(let i=-2;i<=2;i++){
      const x=i*.15; tube(upper,trim,[[x*.65,1.09,-.27],[x*.9,.72,-.32],[x*1.2,.62,-.34]],.009);
    }
    tube(upper,'#e7dec7',[[-.23,1.35,-.22],[0,1.12,-.31],[.24,1.35,-.22]],.035);
    tube(upper,trim,[[-.27,1.29,-.23],[.02,1.05,-.32],[.24,.76,-.32]],.016);
    const hem=mesh(upper,new T.TorusGeometry(.405,.023,6,40),trim,0,.62,0);hem.rotation.x=Math.PI/2;hem.scale.y=.82;
    if(p.outfit==='cheo'){
      // Broad diagonal sash, following the rounded chest instead of a flat box.
      for(let i=0;i<7;i++)tube(upper,i%2?'#c6a461':'#d9bd7e',[[-.29,1.35-i*.024,-.23],[0,1.13-i*.024,-.345],[.36,.94-i*.024,-.2]],.022);
    }
    const arm=(side:number)=>{
      const root=new T.Group(),forearm=new T.Group(),hand=new T.Group();upper.add(root);root.position.set(side*.34,1.22,0);
      mesh(root,new T.CylinderGeometry(.155,.17,.33,20),p.color,0,-.165,0);
      root.add(forearm);forearm.position.y=-.33;
      mesh(forearm,new T.CylinderGeometry(.17,.145,.3,20),p.color,0,-.15,0);
      const cuff=mesh(forearm,new T.TorusGeometry(.145,.02,6,20),trim,0,-.28,0);cuff.rotation.x=Math.PI/2;
      forearm.add(hand);hand.position.y=-.3;ellipsoid(hand,skin,0,-.025,0,.085,.11,.07);
      bake(root,[forearm]);bake(forearm,[hand]);bake(hand);return {root,forearm,hand};
    };
    const armL=arm(-1),armR=arm(1);
    ellipsoid(upper,skin,0,1.39,0,.14,.19,.14);
    const head=ellipsoid(upper,skin,0,1.83,0,.435,.46,.395);
    for(const side of [-1,1]){
      ellipsoid(upper,skin,side*.425,1.79,0,.082,.13,.07);
      ellipsoid(upper,'#c99778',side*.44,1.79,-.045,.036,.065,.025);
      ellipsoid(upper,dark,side*.145,1.82,-.365,.038,.057,.021);
      ellipsoid(upper,'#fff8e4',side*.153,1.84,-.385,.011,.016,.009);
      ellipsoid(upper,'#d5a08a',side*.245,1.71,-.325,.062,.037,.015);
      tube(upper,'#78614d',[[side*.1,1.96,-.37],[side*.15,1.98,-.37],[side*.19,1.96,-.35]],.012);
    }
    ellipsoid(upper,skin,0,1.75,-.395,.048,.055,.04);
    tube(upper,'#9b7058',[[-.048,1.65,-.365],[0,1.64,-.375],[.048,1.65,-.365]],.009);
    // Soft dark hair cap; face remains visible from the front (-Z).
    mesh(upper,new T.SphereGeometry(.442,32,16,0,Math.PI*2,0,1.24),'#444039',0,1.85,.015).scale.set(1,1,.94);
    ellipsoid(upper,'#444039',-.09,2.255,.01,.15,.075,.14);
    for(let i=0;i<15;i++){const a=i/15*Math.PI*2;ellipsoid(upper,'#b89459',Math.cos(a)*.235,1.34+Math.sin(a)*.07,-.23-Math.sin(a)*.08,.035,.035,.035);}
    const incense=new T.Group(),flowers=new T.Group(),beads=new T.Group(),mallet=new T.Group(),wood=new T.Group();
    upper.add(incense,flowers,beads);armR.hand.add(mallet);group.add(wood);
    for(let i=-1;i<=1;i++){
      mesh(incense,new T.CylinderGeometry(.011,.011,.57,6),'#a56b40',i*.055,1.4,-.43);
      ellipsoid(incense,'#e79c54',i*.055,1.69,-.43,.019,.025,.019);
      tube(flowers,'#678154',[[i*.06,1.03,-.43],[i*.14,1.39,-.43]],.015);
      lotus(flowers,i*.14,1.42,-.43,.15,'#e1acb6');
    }
    for(let i=0;i<15;i++){const t=i*Math.PI*2/15;ellipsoid(beads,'#ac8250',.04+Math.cos(t)*.14,.86+Math.sin(t)*.17,-.43,.027,.027,.027);}
    // Dui follows the wrist; its striking head points beyond the hands.
    const shaft=mesh(mallet,new T.CylinderGeometry(.025,.025,.48,10),'#886044',0,-.025,-.18);shaft.rotation.x=Math.PI/2;
    ellipsoid(mallet,'#bf995f',0,-.025,-.4,.095,.095,.14);
    ellipsoid(wood,'#a97543',.36,.19,-.83,.25,.2,.27);
    tube(wood,'#69492f',[[.18,.29,-.92],[.36,.33,-.92],[.54,.29,-.92]],.017);
    for(const prop of [incense,flowers,beads,mallet,wood]){bake(prop);prop.visible=false;}
    bake(upper,[armL.root,armR.root,incense,flowers,beads]);
    return {group,body,upper,armL,armR,standing,seated,kneeling,legs,incense,flowers,beads,mallet,wood};
  }
  function lotus(parent:T.Object3D,x:number,y:number,z:number,r:number,color:string){
    const g=new T.Group();g.position.set(x,y,z);parent.add(g);
    for(let tier=0;tier<2;tier++)for(let i=0;i<10;i++){
      const a=i*Math.PI/5+tier*.31;
      const petal=ellipsoid(g,tier?color:'#e8ddd0',Math.cos(a)*r*.58,tier*r*.14,Math.sin(a)*r*.58,r*.22,r*.18,r*.54);
      petal.rotation.y=-a+Math.PI/2;petal.rotation.x=-.27;
    }
    ellipsoid(g,'#c6a461',0,r*.12,0,r*.27,r*.1,r*.27);return g;
  }
  function buddha(){
    const g=new T.Group(),ivory='#eee6d2',shadow='#cfc2a6',gold='#c6a461';
    mesh(g,new T.CylinderGeometry(1.47,1.6,.2,64),gold,0,.05,0);
    mesh(g,new T.CylinderGeometry(1.34,1.45,.25,64),ivory,0,.24,0);
    lotus(g,0,.44,0,1.5,ivory);
    // Seated figure faces the courtyard (+Z).
    for(const side of [-1,1]){
      ellipsoid(g,ivory,side*.51,.83,.22,.72,.3,.5).rotation.z=side*.14;
      for(let i=0;i<4;i++)tube(g,shadow,[[side*.2,.99+i*.035,.66],[side*.6,.92+i*.035,.64],[side*1.03,.78+i*.035,.4]],.013);
    }
    robe(g,ivory,[[.57,.88],[.59,1.01],[.45,1.37],[.5,1.85],[.36,2.09],[.18,2.18]],.75);
    for(let i=0;i<7;i++)tube(g,shadow,[[-.38+i*.045,1.98,.28],[-.24+i*.07,1.61,.4],[.27+i*.025,1.12,.39]],.012);
    ellipsoid(g,ivory,0,2.15,0,.19,.24,.18);
    ellipsoid(g,ivory,0,2.57,0,.36,.46,.31);
    for(const side of [-1,1]){
      ellipsoid(g,ivory,side*.365,2.47,-.01,.075,.23,.075);
      tube(g,shadow,[[side*.36,2.57,.058],[side*.37,2.42,.065],[side*.34,2.32,.06]],.012);
      tube(g,'#9f927a',[[side*.07,2.59,.302],[side*.14,2.56,.3],[side*.22,2.59,.264]],.012);
      tube(g,shadow,[[side*.07,2.69,.296],[side*.15,2.71,.287],[side*.23,2.68,.245]],.014);
      const arm=ellipsoid(g,ivory,side*.5,1.58,.04,.2,.49,.22);arm.rotation.z=side*.25;
      ellipsoid(g,ivory,side*.31,1.17,.43,.33,.12,.16).rotation.z=side*.12;
      ellipsoid(g,ivory,side*.105,1.19,.55,.17,.065,.14);
      for(let j=0;j<3;j++)tube(g,shadow,[[side*.06,1.235,.56+j*.032],[side*.18,1.23,.55+j*.032]],.006);
    }
    ellipsoid(g,ivory,0,2.52,.317,.055,.11,.065);
    tube(g,'#ae927c',[[-.09,2.38,.288],[0,2.365,.318],[.09,2.38,.288]],.012);
    ellipsoid(g,gold,0,2.76,.294,.023,.023,.012);
    const crown=ellipsoid(g,'#9c9279',0,2.86,-.012,.355,.25,.31);
    for(let row=0;row<4;row++)for(let i=0;i<14;i++){const a=i*Math.PI/7,r=.32*Math.cos(row*.19);ellipsoid(g,'#b0a389',Math.cos(a)*r,2.82+row*.07,Math.sin(a)*r*.87,.043,.043,.043);}
    ellipsoid(g,'#b0a389',0,3.12,-.015,.13,.16,.12);void crown;
    for(const r of [1.22,1.3])mesh(g,new T.TorusGeometry(r,.027,8,80),gold,0,2.18,-.44);
    for(let i=0;i<32;i++){const a=i*Math.PI/16;const leaf=ellipsoid(g,gold,Math.sin(a)*1.37,2.18+Math.cos(a)*1.37,-.44,.065,.14,.025);leaf.rotation.z=-a;}
    return g;
  }
  function garden(scene:T.Scene){
    const staticGarden=new T.Group();scene.add(staticGarden);
    // Stone stepping path and natural plant beds frame the pond.
    for(let i=0;i<9;i++){const a=-.8+i*.19;const rock=ellipsoid(staticGarden,'#b8b49d',-10+Math.cos(a)*5.7,.08,5+Math.sin(a)*5,.55,.15,.37);rock.rotation.y=a;}
    for(let i=0;i<46;i++){
      const side=i%2?-1:1,x=side*(6+(i*7%65)/10),z=-3+(i*11%190)/10;
      if((x<-5&&z>1&&z<10)||Math.hypot(x-10,z-3)<4.2)continue;
      ellipsoid(staticGarden,['#6c8455','#80965d','#96a66c'][i%3],x,.24,z,.65,.35,.55);
      for(let j=0;j<3;j++){
        const xx=x+(j-1)*.21,zz=z+Math.sin(i+j)*.3;
        tube(staticGarden,'#6a8050',[[xx,.2,zz],[xx+.06,.56,zz]],.018);
        ellipsoid(staticGarden,i%2?'#ddbd96':'#e4b9be',xx+.06,.59,zz,.085,.1,.085);
      }
    }
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const x=side*(7+i*.31),z=-14.2+i*.19;mesh(staticGarden,new T.CylinderGeometry(.035,.055,3+i*.17,8),'#7a8b53',x,1.5+i*.085,z);
      for(let j=0;j<5;j++){const leaf=ellipsoid(staticGarden,'#81985b',x+side*.25,1.4+j*.35,z,.36,.065,.12);leaf.rotation.z=side*.4;}
    }
    // Lotus blossoms in the altar vases.
    for(const x of [-2.05,2.05]){
      const vase=robe(staticGarden,'#668c83',[[.13,0],[.26,.12],[.3,.35],[.15,.65],[.2,.75]]);vase.position.set(x,1.67,-11.9);
      for(let i=0;i<3;i++){const xx=x+(i-1)*.2;tube(staticGarden,'#738653',[[x,2.2,-11.9],[xx,2.9+i*.12,-11.9]],.02);lotus(staticGarden,xx,2.9+i*.12,-11.9,.22,'#e0acb2');}
    }
    bake(staticGarden);
    const moving=new T.Group();scene.add(moving);
    const trees:T.Group[]=[];
    for(const [x,z]of [[12,8],[-13,12],[13,-3],[-14,-3]]){
      const tree=new T.Group();tree.position.set(x,1.9,z);moving.add(tree);
      for(let i=0;i<11;i++){
        const a=i*2.4;const leaf=ellipsoid(tree,['#78935f','#8da36b','#a4b87d'][i%3],Math.cos(a)*(i%3)*.55,1+i*.15,Math.sin(a)*.7,.85,.45,.65);leaf.rotation.z=Math.cos(a)*.25;
      }
      bake(tree);trees.push(tree);
    }
    const ripples:T.Mesh[]=[];
    for(let i=0;i<5;i++){
      const ring=new T.Mesh(new T.RingGeometry(.93,1,64),new T.MeshBasicMaterial({color:'#c2dace',transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(-10+(i%3-1)*1.6,.09,5+(i%2-.5)*2.6);moving.add(ring);ripples.push(ring);
    }
    const butterflies:T.Group[]=[];
    for(let i=0;i<6;i++){
      const b=new T.Group();moving.add(b);
      for(const side of [-1,1]){const wing=ellipsoid(b,i%2?'#f2d29b':'#e0c1ca',side*.1,0,0,.12,.025,.18);wing.userData.side=side;}
      butterflies.push(b);
    }
    const leafGeometry=new T.SphereGeometry(.06,5,4),leafMaterial=material('#e8c4a4');
    const petals=new T.InstancedMesh(leafGeometry,leafMaterial,35);petals.instanceMatrix.setUsage(T.DynamicDrawUsage);petals.frustumCulled=false;moving.add(petals);const dummy=new T.Object3D();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    function update(time:number){const t=reduced?0:time;
      trees.forEach((tree,i)=>{tree.rotation.z=Math.sin(t*.65+i)*.025;tree.rotation.x=Math.cos(t*.42+i)*.018;});
      ripples.forEach((r,i)=>{const phase=(t*.2+i*.23)%1;r.scale.setScalar(.3+phase*1.4);(r.material as T.MeshBasicMaterial).opacity=(1-phase)*.19;});
      butterflies.forEach((b,i)=>{b.position.set(-9+Math.cos(t*.3+i)*2.5,1.1+Math.sin(t*.7+i)*.35,5+Math.sin(t*.4+i)*2);b.rotation.y=t*.4+i;b.children.forEach(w=>{w.rotation.z=Math.sin(t*12)*.8*w.userData.side;});});
      for(let i=0;i<35;i++){dummy.position.set(Math.sin(i*25.4)*13+Math.sin(t*.4+i)*.7,5-((t*.23+i*.31)%5),Math.cos(i*8.7)*14+Math.cos(t*.2+i)*.8);dummy.rotation.set(t+i,i,t*.4);dummy.scale.set(1,.35,1.8);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);}petals.instanceMatrix.needsUpdate=true;
    }
    return {update,dispose(){ripples.forEach(r=>(r.material as T.Material).dispose());}};
  }
  return {avatar,buddha,garden,dispose(){materials.forEach(m=>m.dispose());}};
}
