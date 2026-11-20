import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Client, type Room} from '@colyseus/sdk';
import {createTemple} from './scene';
import {ACTIONS,WOOD_PERIOD_MS,LANTERN_COLORS,actionRadius,COLORS,OUTFITS,ZONES,type OutfitId,type ChatView,type ActionId,type WorldView,type PlayerView,type OfferingView,type LanternView} from './shared';
import {ambient,tone,unlockAudio} from './audio';
import {OutfitPicker,ColorPicker,RoomChat} from './social';
import './style.css';
const empty:WorldView={players:[],offerings:[],messages:[],lanterns:[]};
const read=(key:string,fallback:string)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const save=(key:string,value:string)=>{try{localStorage.setItem(key,value);}catch{/* Private browsing may block storage. */}};
const endpoint=import.meta.env.VITE_ROOM_SERVER || `${location.protocol==='https:'?'wss':'ws'}://${location.hostname}:${import.meta.env.DEV?'2567':location.port|| (location.protocol==='https:'?'443':'80')}`;
function Lotus({className=''}:{className?:string}){return <svg className={className} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M24 37C12 30 15 18 24 8c9 10 12 22 0 29Z"/><path d="M24 37C10 38 4 28 5 18c10 0 18 7 19 19ZM24 37c14 1 20-9 19-19-10 0-18 7-19 19Z"/><path d="M7 37c8 6 26 6 34 0"/></svg>;}
function App(){
  const host=useRef<HTMLDivElement>(null),scene=useRef<ReturnType<typeof createTemple>|null>(null),roomRef=useRef<Room|null>(null);
  const [world,setWorld]=useState<WorldView>(empty),[roomId,setRoomId]=useState(''),[selfId,setSelfId]=useState('');
  const [name,setName]=useState(()=>read('an-name','')),[color,setColor]=useState(()=>read('an-color',COLORS[0]));
  const [outfit,setOutfit]=useState<OutfitId>(()=>{const stored=read('an-outfit','lam');return OUTFITS.find(o=>o.id===stored)?.id??'lam';});
  const [lanternColor,setLanternColor]=useState(LANTERN_COLORS[0]);
  const [night,setNight]=useState(()=>read('an-lighting','day')==='night');
  const [rain,setRain]=useState(()=>read('an-weather','calm')==='rain');
  const firstLighting=useRef(true);
  const [chatOpen,setChatOpen]=useState(()=>window.innerWidth>1100);
  const [joining,setJoining]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[disconnected,setDisconnected]=useState(false),[glError,setGlError]=useState(false);
  const [panel,setPanel]=useState<ActionId|'help'|'invite'|'sound'|'wardrobe'|'map'|null>(null),[flower,setFlower]=useState('#dda3aa'),[minutes,setMinutes]=useState(3),[beads,setBeads]=useState(0),[now,setNow]=useState(Date.now());
  const [sound,setSound]=useState(()=>read('an-sound','false')==='true'),[music,setMusic]=useState(false),[others,setOthers]=useState(false);
  const soundRef=useRef(sound),othersRef=useRef(others),leaving=useRef(false),lastMeditation=useRef(0);
  const invited=new URLSearchParams(location.search).get('room');
  const me=world.players.find(p=>p.id===selfId),active=me?.action??'idle';
  const remaining=me?.action==='meditate'?Math.max(0,Math.ceil((me.startedAt+me.duration-now)/1000)):0;
  const nearest=me?Object.entries(ZONES).sort(([,a],[,b])=>Math.hypot(me.x-a.x,me.z-a.z)-Math.hypot(me.x-b.x,me.z-b.z))[0][1].label:'Sân chùa';
  useEffect(()=>{soundRef.current=sound;save('an-sound',String(sound));},[sound]);useEffect(()=>{othersRef.current=others;},[others]);
  useEffect(()=>{if(!host.current)return;try{scene.current=createTemple(host.current,(x,z,yaw)=>{if(roomRef.current&&!roomRef.current.reconnection.isReconnecting)roomRef.current.send('move',{x,z,yaw});},()=>setGlError(true));}catch{setGlError(true);}return()=>{scene.current?.dispose();void roomRef.current?.leave();ambient(false);};},[]);
  useEffect(()=>{scene.current?.setNight(night,firstLighting.current);firstLighting.current=false;save('an-lighting',night?'night':'day');},[night]);
  useEffect(()=>{scene.current?.setRain(rain);save('an-weather',rain?'rain':'calm');},[rain]);
  const audibleWood=world.players.filter(p=>p.connected&&p.action==='wood'&&(p.id===selfId||others)).map(p=>p.startedAt).join(',');
  useEffect(()=>{
    if(!sound||disconnected||!audibleWood)return;
    const timers=audibleWood.split(',').map(start=>{
      let timer:ReturnType<typeof setTimeout>;
      function schedule(){
        const phase=(Date.now()-Number(start)+WOOD_PERIOD_MS)%WOOD_PERIOD_MS;
        const delay=(WOOD_PERIOD_MS*1.5-phase)%WOOD_PERIOD_MS;
        timer=setTimeout(()=>{tone('wood');schedule();},delay<12?WOOD_PERIOD_MS:delay);
      }
      schedule();return ()=>clearTimeout(timer);
    });
    return ()=>timers.forEach(cancel=>cancel());
  },[sound,disconnected,audibleWood]);
  useEffect(()=>{scene.current?.setWorld(world,selfId);},[world,selfId]);
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(id);},[]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(t);},[notice]);
  useEffect(()=>{if(active==='meditate'&&me)lastMeditation.current=me.startedAt+me.duration;else if(lastMeditation.current){if(Date.now()>=lastMeditation.current-500){if(soundRef.current)tone('bell');setNotice('Buổi thiền đã hoàn tất. Chúc bạn một ngày an lành.');}lastMeditation.current=0;}},[active,me?.startedAt]);
  async function enter(fresh=false){
    if(joining)return;setJoining(true);setError('');leaving.current=false;
    try{
      unlockAudio();save('an-name',name.trim());save('an-color',color);save('an-outfit',outfit);
      const client=new Client(endpoint);const opts={name:name.trim()||'Khách an nhiên',color,outfit};
      const r=invited&&!fresh?await client.joinById(invited,opts):await client.create('temple',opts);
      r.reconnection.minUptime=0;
      roomRef.current=r;setRoomId(r.roomId);setSelfId(r.sessionId);setDisconnected(false);
      history.replaceState(null,'',`${location.pathname}?room=${encodeURIComponent(r.roomId)}`);
      r.onStateChange(state=>{
        const players:PlayerView[]=[],offerings:OfferingView[]=[];
        state.players?.forEach((p:PlayerView,id:string)=>players.push({...JSON.parse(JSON.stringify(p)),id}));
        state.offerings?.forEach((o:OfferingView,id:string)=>offerings.push({...JSON.parse(JSON.stringify(o)),id}));const messages:ChatView[]=JSON.parse(JSON.stringify(state.messages??[]));const lanterns:LanternView[]=[];state.lanterns?.forEach((l:LanternView,id:string)=>lanterns.push({...JSON.parse(JSON.stringify(l)),id}));setWorld({players,offerings,messages,lanterns});
      });
      r.onMessage('notice',(msg:string)=>setNotice(msg));
      r.onMessage('bell',({id,impactAt}:{id:string;impactAt:number})=>{
        setTimeout(()=>{if(roomRef.current===r&&soundRef.current&&(id===r.sessionId||othersRef.current))tone('templeBell');},Math.max(0,Math.min(1000,impactAt-Date.now())));
      });
      r.onDrop(()=>{setDisconnected(true);setNotice('Đang kết nối lại… chỗ của bạn được giữ trong 30 giây.');});
      r.onReconnect(()=>{setDisconnected(false);setNotice('Đã kết nối lại.');});
      r.onLeave(()=>{if(roomRef.current!==r)return;roomRef.current=null;setRoomId('');setSelfId('');setWorld(empty);setDisconnected(false);setPanel(null);ambient(false);setMusic(false);if(!leaving.current)setError('Kết nối đã kết thúc hoặc phòng không còn tồn tại. Hãy thử vào lại hoặc tạo phòng mới.');});
      r.onError(()=>setNotice('Kết nối phòng gặp lỗi. Vui lòng thử lại.'));
      setNotice('Chạm vào lối đi để di chuyển. Kéo màn hình để ngắm chùa.');
    }catch(e){const msg=e instanceof Error?e.message:'';setError(/full|locked|maxClients/i.test(msg)?'Phòng đã đủ 5 người. Bạn có thể tạo một phòng mới.':/not found|not defined|expired|invalid/i.test(msg)?'Phòng không còn tồn tại. Bạn có thể tạo một phòng mới.':'Chưa kết nối được với chùa. Hãy kiểm tra mạng và thử lại.');}
    finally{setJoining(false);}
  }
  function send(type:string,data?:unknown){if(disconnected){setNotice('Vui lòng chờ kết nối được khôi phục.');return;}roomRef.current?.send(type,data);}
  function changeOutfit(next:OutfitId,nextColor:string){setOutfit(next);setColor(nextColor);save('an-outfit',next);save('an-color',nextColor);if(roomRef.current)send('outfit',{outfit:next,color:nextColor});}
  function travel(zone:string){send('travel',zone);scene.current?.resetCamera();setPanel(null);}
  function act(id:ActionId){
    unlockAudio();const action=ACTIONS.find(a=>a.id===id);if(!action||!me)return;
    const z=ZONES[action.zone];if(Math.hypot(me.x-z.x,me.z-z.z)>actionRadius(id)){setNotice(`Hãy đến ${z.label.toLowerCase()} để ${action.name.toLowerCase()}.`);return;}
    send('act',{id,color:id==='lantern'?lanternColor:flower,minutes});if(id==='meditate'&&sound)tone('bell');
  }
  async function leave(){leaving.current=true;await roomRef.current?.leave();history.replaceState(null,'',location.pathname);}
  const current=ACTIONS.find(a=>a.id===panel);
  return <main className={`experience${roomId?' entered':''}${night?' night':''}`}>
    <div className="scene" ref={host} aria-label="Không gian chùa An Nhiên 3D"/>
    <div className="vignette"/>
    <header className="topbar">
      <a href={location.pathname} className="brand" onClick={e=>{e.preventDefault();if(roomId)setPanel('help');}}><Lotus/><span>AN NHIÊN<small>CHÙA TRONG TÂM</small></span></a>
      <div className="top-actions"><button className="pill lighting-toggle" aria-label={rain?'Chuyển thời tiết sang bình yên':'Chuyển thời tiết sang mưa'} aria-pressed={rain} title={rain?'Chuyển sang bình yên':'Chuyển sang mưa'} onClick={()=>setRain(v=>!v)}><span aria-hidden="true">{rain?'☂':'☁'}</span><span>{rain?'Mưa':'Bình yên'}</span></button><button className="pill lighting-toggle" aria-label={night?'Chuyển sang ban ngày':'Chuyển sang ban đêm'} aria-pressed={night} title={night?'Chuyển sang ban ngày':'Chuyển sang ban đêm'} onClick={()=>setNight(n=>!n)}><span aria-hidden="true">{night?'☾':'☀'}</span><span>{night?'Ban đêm':'Ban ngày'}</span></button>{roomId?<><span className={'presence '+(disconnected?'offline':'')}><i/>{disconnected?'Kết nối lại':`${world.players.length} / 5 người`}</span><button className="pill invite-button" onClick={()=>setPanel('invite')}>＋ <span>Mời bạn</span></button><button className="circle" aria-label="Cài đặt âm thanh" onClick={()=>setPanel('sound')}>{sound?'♫':'♪'}</button><button className="circle" aria-label="Rời phòng" onClick={()=>void leave()}>↗</button></>:<><span className="private-note">MỘT KHÔNG GIAN BÌNH YÊN</span><button className="pill" onClick={()=>setPanel('help')}>Về An Nhiên ↗</button></>}</div>
    </header>
    {!roomId&&<section className="welcome">
      <span className="eyebrow"><span/> DỪNG LẠI MỘT CHÚT, THỞ NHẸ MỘT HƠI</span>
      <h1>Một khoảng lặng.<br/><em>Một tâm an.</em></h1>
      <p>Gác lại những bộn bề. Bước vào một ngôi chùa nhỏ,<br className="desktop"/> cùng người thân tìm lại sự an nhiên.</p>
      <form className="entry-card" onSubmit={e=>{e.preventDefault();void enter();}}>
        <div className="entry-title"><span>Hôm nay, bạn ghé chùa cùng ai?</span><span className="tag">1–5 NGƯỜI</span></div>
        <label className="name-label" htmlFor="name">Tên của bạn</label><input id="name" maxLength={24} placeholder="Một người hữu duyên" value={name} onChange={e=>setName(e.target.value)}/>
        <OutfitPicker outfit={outfit} color={color} onChange={changeOutfit}/><ColorPicker color={color} onChange={c=>changeOutfit(outfit,c)}/>
        <button className="primary entry-cta" disabled={joining||glError} type="submit">{joining?'Đang mở cửa chùa…':invited?'Vào phòng được mời':'Bước vào chùa'}<span>→</span></button>
        {invited&&<button type="button" className="text-button" disabled={joining} onClick={()=>void enter(true)}>Hoặc tạo một không gian mới</button>}
        {error&&<p className="error" role="alert">{error}</p>}
        <small className="entry-foot">Không cần tài khoản <b>·</b> Miễn phí trải nghiệm</small>
      </form>
      <div className="welcome-bottom"><span>✧ Kiến trúc Việt</span><span>◌ Thực hành mỗi ngày</span><span>♧ Cùng người thân</span></div>
    </section>}
    {!roomId&&<div className="scene-caption"><span className="caption-line"/><span>CHÙA AN NHIÊN<small>Một nơi để trở về, dù bạn ở đâu.</small></span><span className="orbit-hint">↔ Kéo để ngắm nhìn</span></div>}
    {roomId&&<>
      <nav className="destinations" aria-label="Đi đến khu vực"><span className="eyebrow">DẠO BƯỚC TRONG CHÙA</span>{Object.entries(ZONES).filter(([key])=>['hall','offering','garden'].includes(key)).map(([key,z],i)=><button key={key} disabled={disconnected} className={nearest===z.label?'destination active':'destination'} onClick={()=>travel(key)}><span>0{i+1}</span>{z.label}<span>↗</span></button>)}<button className="destination explore-destination" onClick={()=>{setPanel('map');if(window.innerWidth<1100)setChatOpen(false);}}><span>✧</span>Khám phá<span>＋</span></button><div className="room-members">{world.players.map(p=><span key={p.id} title={p.name} style={{background:p.color}}>{p.name[0]}</span>)}<small>Cùng nhau, an nhiên.</small></div></nav>
      <div className="camera-tools"><button className="circle" aria-label="Ngắm bầu trời" title="Ngắm bầu trời" onClick={()=>scene.current?.lookAtSky()}>☁</button><button className="circle" aria-label="Phóng to" title="Phóng to" onClick={()=>scene.current?.zoom(-3)}>＋</button><button className="circle" aria-label="Thu nhỏ" title="Thu nhỏ" onClick={()=>scene.current?.zoom(3)}>−</button><button className="circle wardrobe-button" aria-label="Thay trang phục" title="Thay trang phục" onClick={()=>{setPanel('wardrobe');if(window.innerWidth<1100)setChatOpen(false);}}>♙</button><button className="circle" aria-label="Đặt lại góc nhìn" onClick={()=>scene.current?.resetCamera()}>⌖</button><button className="circle" aria-label="Hướng dẫn" onClick={()=>setPanel('help')}>?</button></div>
      <RoomChat key={roomId} messages={world.messages} selfId={selfId} open={chatOpen} onToggle={()=>{setChatOpen(!chatOpen);if(!chatOpen&&window.innerWidth<1100)setPanel(null);}} onSend={text=>send('chat',{text})} disabled={disconnected} now={now}/>
      <div className="location"><i/> {nearest}<small>{active!=='idle'?ACTIONS.find(a=>a.id===active)?.name:'Chạm để đi · Kéo để xoay'}</small></div>
      <section className="ritual-dock" aria-label="Các hoạt động thực hành"><div className="dock-heading"><span>MỘT CHÚT THÀNH TÂM</span><span>Bình yên từ những điều nhỏ</span></div><div className="rituals">{ACTIONS.map(a=><button key={a.id} disabled={disconnected} className={panel===a.id||active===a.id?'ritual selected':'ritual'} onClick={()=>setPanel(panel===a.id?null:a.id)}><span className="ritual-icon">{a.icon}</span><span>{a.name}</span><i/></button>)}</div></section>
      {active!=='idle'&&<div className="active-practice"><span className="pulse"/>{active==='meditate'?`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} · Nhẹ nhàng hít thở`:ACTIONS.find(a=>a.id===active)?.name}<button onClick={()=>send('stop')}>{active==='wood'?'Dừng gõ mõ':'Kết thúc ×'}</button></div>}
    </>}
    {panel&&<aside className={'drawer '+(panel==='wardrobe'?'wardrobe-drawer':panel==='map'?'map-drawer':'')} aria-label={current?.name??'Thông tin'}><button className="close circle" aria-label="Đóng bảng" onClick={()=>setPanel(null)}>×</button>
      {current&&<><div className="drawer-symbol">{current.icon}</div><span className="eyebrow">THỰC HÀNH TRONG CHÁNH NIỆM</span><h2>{current.name}</h2><p>{current.hint}</p>
        {panel==='lantern'&&<><p>Thả một chiếc đèn tại sân thoáng và ngắm nó bay lên. Mọi người trong phòng cùng nhìn thấy đèn của bạn.</p><div className="flower-choices lantern-choices">{LANTERN_COLORS.map((c,i)=><button key={c} className={lanternColor===c?'chosen':''} aria-pressed={lanternColor===c} onClick={()=>setLanternColor(c)}><span style={{color:c}}>◈</span>{['Đỏ son','Vàng ấm','Hồng sen'][i]}</button>)}</div><button className="text-button" onClick={()=>{scene.current?.lookAtSky();setPanel(null);}}>Ngắm đèn trên trời</button>{!night&&<button className="text-button" onClick={()=>setNight(true)}>Chuyển sang đêm để ngắm đèn</button>}</>}
        {panel==='bell'&&<><p>Đến gần lầu chuông, nhân vật sẽ đứng trước chuông và dùng dùi gõ. Mỗi lượt có một tiếng ngân.</p>{!sound&&<button className="text-button" onClick={()=>{unlockAudio();setSound(true);}}>Bật âm thanh chuông</button>}<small>{world.players.some(p=>p.action==='bell')?'Chuông đang ngân…':'Mọi người cùng phòng đều nhìn thấy chuông rung.'}</small></>}
        {panel==='flower'&&<div className="flower-choices">{['#dda3aa','#f3e4c3','#bba6ce'].map((c,i)=><button key={c} className={flower===c?'chosen':''} onClick={()=>setFlower(c)}><span style={{color:c}}>❀</span>{['Sen hồng','Sen trắng','Sen tím'][i]}</button>)}</div>}
        {panel==='meditate'&&<><div className="breathing-orb"><Lotus/></div><div className="time-choices">{[3,5,10].map(m=><button className={minutes===m?'chosen':''} key={m} onClick={()=>setMinutes(m)}>{m} phút</button>)}</div><small>Ngồi thoải mái, thả lỏng vai. Bạn có thể dừng bất cứ lúc nào.</small></>}
        {panel==='beads'&&<><button className="bead-counter" disabled={active!=='beads'} onClick={()=>setBeads(b=>b+1)} aria-label="Lần một hạt"><span>◌</span><strong>{beads}</strong><small>CHẠM ĐỂ LẦN HẠT</small></button><button className="text-button" onClick={()=>setBeads(0)}>Đặt lại bộ đếm</button></>}
        {panel==='chant'&&<div className="chant-content"><span className="tag">NIỆM PHẬT · BẢN THỬ</span><blockquote>Nam mô Bổn Sư<br/>Thích Ca Mâu Ni Phật.</blockquote><a href="https://phatgiao.org.vn/tu-dien-phat-hoc-online/nam-mo-bon-su-thich-ca-mau-ni-phat-k57508.html" target="_blank" rel="noreferrer">Nguồn: Cổng thông tin Phật giáo Việt Nam ↗</a><p>Bạn có thể tự đọc lời niệm. Bài kinh và bản thu âm sẽ được bổ sung sau khi có nội dung được duyệt.</p></div>}
        {me&&Math.hypot(me.x-ZONES[current.zone].x,me.z-ZONES[current.zone].z)>actionRadius(current.id)?<button className="primary" onClick={()=>travel(current.zone)}>Đến {ZONES[current.zone].label.toLowerCase()} →</button>:<button className="primary" disabled={disconnected||(panel==='bell'&&world.players.some(p=>p.action==='bell'))} onClick={()=>active===panel&&panel!=='lantern'&&panel!=='bell'?send('stop'):act(current.id)}>{active===panel&&panel!=='lantern'&&panel!=='bell'?(panel==='wood'?'Dừng gõ mõ':'Kết thúc thực hành'):panel==='wood'?'Bắt đầu gõ mõ':panel==='bell'?'Gõ một tiếng chuông':panel==='lantern'?'Thả đèn lên trời':`Bắt đầu ${current.name.toLowerCase()}`}</button>}
        <small className="privacy-note">{panel==='beads'||panel==='meditate'?'Bộ đếm chỉ hiển thị với bạn.':'Bạn bè trong phòng nhìn thấy động tác của bạn.'}</small>
      </>}
      {panel==='help'&&<><Lotus className="drawer-lotus"/><span className="eyebrow">CHÀO BẠN HỮU DUYÊN</span><h2>Một nơi để trở về.</h2><p>An Nhiên là không gian thực hành trực tuyến dành cho bạn và những người thân yêu.</p><ol className="help-list"><li><b>Dạo bước</b><span>Chạm mặt đất để di chuyển. Máy tính có thể dùng WASD hoặc phím mũi tên.</span></li><li><b>Ngắm nhìn</b><span>Kéo ngang để xoay, kéo dọc để ngẩng/cúi. Cuộn chuột, chụm hai ngón hoặc dùng nút +/− để thu phóng. Nút mây mở góc ngắm trời; nút tâm ngắm đặt lại camera. Nút ngày/đêm ở góc trên đổi ánh sáng riêng cho bạn; ban đêm có trăng, sao và sao băng.</span></li><li><b>Thực hành</b><span>Chọn khu vực, chọn hoạt động ở thanh dưới và bắt đầu khi đã sẵn sàng.</span></li><li><b>Cùng người thân</b><span>Tạo phòng rồi chia sẻ link mời. Mỗi phòng có tối đa 5 người.</span></li></ol><p className="subtle">Bản trải nghiệm dùng kiến trúc và động tác cách điệu. Nội dung nghi lễ đầy đủ đang chờ duyệt.</p><button className="primary" onClick={()=>setPanel(null)}>Mình đã hiểu</button></>}
      {panel==='invite'&&<><div className="drawer-symbol">♧</div><span className="eyebrow">CHIA SẺ MỘT KHOẢNG LẶNG</span><h2>Mời người hữu duyên.</h2><p>Gửi đường dẫn này cho người thân. Phòng hiện có {world.players.length}/5 người.</p><label className="name-label" htmlFor="invite">Đường dẫn phòng</label><input id="invite" readOnly value={location.href} onFocus={e=>e.target.select()}/><button className="primary" onClick={async()=>{try{await navigator.clipboard.writeText(location.href);setNotice('Đã sao chép link mời.');}catch{setNotice('Hãy chọn và sao chép đường dẫn trong ô.');}}}>Sao chép đường dẫn ↗</button><p className="subtle">Ai có đường dẫn đều có thể vào khi còn chỗ. Phòng tự đóng sau khi mọi người rời đi.</p></>}
      {panel==='map'&&<><span className="eyebrow">KHUÔN VIÊN RỘNG GẤP ĐÔI</span><h2>Dạo vườn chùa</h2><p>Thêm những lối nhỏ, thêm những khoảng bình yên.</p><div className="explore-cards">{[{id:'lantern',icon:'🏮',hint:'Thả đèn, gửi lời nguyện an lành lên trời.'},{id:'waterfall',icon:'≈',hint:'Mặt hồ xanh, thác đổ và ghế bên bờ.'},{id:'bell',icon:'♧',hint:'Lầu gỗ mái ngói với đại hồng chung.'},{id:'pavilion',icon:'⌂',hint:'Chòi nghỉ giữa vườn cây nở hoa.'},{id:'bamboo',icon:'〃',hint:'Lối đá uốn quanh những khóm trúc.'}].map(z=><button key={z.id} disabled={disconnected} onClick={()=>travel(z.id)}><span>{z.icon}</span><span><strong>{ZONES[z.id].label}</strong><small>{z.hint}</small></span><span>↗</span></button>)}</div><small>Chọn nơi muốn ghé để đến ngay. Bạn cũng có thể đi theo lối đá hai bên sân.</small></>}
      {panel==='wardrobe'&&<><span className="eyebrow">MỘT DÁNG VẺ AN NHIÊN</span><h2>Chọn trang phục</h2><p>Chiếc áo cho buổi ghé chùa hôm nay.</p><fieldset className="wardrobe-fieldset" disabled={disconnected}><OutfitPicker outfit={outfit} color={color} onChange={changeOutfit}/><ColorPicker color={color} onChange={c=>changeOutfit(outfit,c)}/></fieldset><p className="subtle">Trang phục được cập nhật với mọi người trong phòng.</p><button className="primary" onClick={()=>setPanel(null)}>Tiếp tục dạo chùa →</button></>}
      {panel==='sound'&&<><div className="drawer-symbol">♫</div><span className="eyebrow">LẮNG NGHE SỰ TĨNH LẶNG</span><h2>Âm thanh</h2>{[{label:'Tiếng chuông & mõ',value:sound,set:(v:boolean)=>{unlockAudio();setSound(v);if(v)tone('bell');}},{label:'Âm nền dịu nhẹ',value:music,set:(v:boolean)=>{setMusic(v);ambient(v);}},{label:'Nghe chuông & mõ của bạn bè',value:others,set:setOthers}].map(s=><label className="toggle-row" key={s.label}><span>{s.label}</span><input type="checkbox" checked={s.value} onChange={e=>s.set(e.target.checked)}/></label>)}<p className="subtle">Âm thanh mặc định tắt. Chọn những âm thanh khiến bạn thấy dễ chịu.</p></>}
    </aside>}
    {notice&&<div className="toast" role="status">{notice}</div>}
    {glError&&<div className="fatal" role="alert"><Lotus/><h2>Chưa mở được không gian 3D</h2><p>Thiết bị có thể chưa hỗ trợ WebGL hoặc đã mất kết nối đồ họa. Hãy thử tải lại hoặc mở bằng trình duyệt khác.</p><button className="primary" onClick={()=>location.reload()}>Thử lại</button></div>}
    <footer className="footer"><span>AN NHIÊN © 2026</span><span>THỞ VÀO AN LẠC · THỞ RA THẢNH THƠI</span><span>BẢN TRẢI NGHIỆM 06</span></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
