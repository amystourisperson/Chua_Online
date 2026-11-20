import React,{useEffect,useRef,useState} from 'react';
import {COLORS,OUTFITS,type OutfitId,type ChatView} from './shared';

export function OutfitPicker({outfit,color,onChange}:{outfit:OutfitId;color:string;onChange:(outfit:OutfitId,color:string)=>void}){
  return <div className="wardrobe-options" role="group" aria-label="Chọn trang phục">
    {OUTFITS.map(o=><button type="button" key={o.id} className={'outfit-card '+(outfit===o.id?'chosen':'')} aria-pressed={outfit===o.id} onClick={()=>onChange(o.id,color)}>
      <svg viewBox="0 0 92 105" aria-hidden="true">
        <ellipse cx="46" cy="98" rx="27" ry="4" fill="#243c2d15"/>
        {o.id==='lam'?<><path d="M31 70h13v24H30zm17 0h13l1 24H48" fill="#dad9c9"/><path d="M28 48Q46 39 64 48L68 78Q46 85 24 78Z" fill={color}/></>:<path d="M30 48Q46 39 62 48L72 94Q46 104 20 94Z" fill={color}/>}
        <path d="M29 49l-9 23 9 5 8-25m26-3 9 23-9 5-8-25" fill={color} stroke="#344e4025" strokeWidth="2"/>
        <path d="M33 48l13 13 13-13" fill="none" stroke="#f0e6cd" strokeWidth="4"/>
        {o.id==='cheo'&&<path d="M30 49q16 14 34 20l-3 10Q42 68 27 58Z" fill="#d6b97b"/>}
        <path d="M34 68l-4 21m15-22v27m12-18 6 14" stroke="#243c2d30" fill="none"/>
        <circle cx="46" cy="28" r="23" fill="#e4ba92"/>
        <path d="M23 27a23 23 0 0146 0q-23-10-46 0" fill="#444039"/>
        <ellipse cx="38" cy="31" rx="2" ry="3" fill="#37372e"/><ellipse cx="54" cy="31" rx="2" ry="3" fill="#37372e"/>
        <path d="M42 40q4 3 8 0" stroke="#aa7f65" fill="none"/>
        <circle cx="28" cy="75" r="5" fill="#e4ba92"/><circle cx="65" cy="75" r="5" fill="#e4ba92"/>
      </svg><strong>{o.name}</strong><span>{o.detail}</span>{outfit===o.id&&<i>✓</i>}
    </button>)}
  </div>;
}
export function ColorPicker({color,onChange}:{color:string;onChange:(color:string)=>void}){
  return <div className="avatar-options"><span>Màu vải</span><div className="swatches">{COLORS.map((c,i)=><button key={c} type="button" aria-label={`Màu áo ${['lam xanh','tím nhạt','nâu','xanh trời'][i]}`} aria-pressed={color===c} className={color===c?'swatch selected':'swatch'} style={{background:c}} onClick={()=>onChange(c)}>{color===c?'✓':''}</button>)}</div></div>;
}
export function RoomChat({messages,selfId,open,onToggle,onSend,disabled,now}:{messages:ChatView[];selfId:string;open:boolean;onToggle:()=>void;onSend:(text:string)=>void;disabled:boolean;now:number}){
  const [draft,setDraft]=useState(''),[sentAt,setSentAt]=useState(0),[seen,setSeen]=useState('');
  const log=useRef<HTMLDivElement>(null),follow=useRef(true),input=useRef<HTMLInputElement>(null);
  const latest=messages.at(-1)?.id??'';
  useEffect(()=>{if(open){setSeen(latest);if(log.current&&follow.current)log.current.scrollTop=log.current.scrollHeight;}},[latest,open]);
  const unread=messages.filter(m=>Number(m.id)>Number(seen||0)&&m.senderId!==selfId).length;
  const cooling=now-sentAt<1200;
  function submit(e:React.FormEvent){e.preventDefault();const text=draft.trim();if(!text||disabled||Date.now()-sentAt<1200)return;onSend(text);setDraft('');setSentAt(Date.now());follow.current=true;input.current?.focus();}
  return <section className={'room-chat '+(open?'expanded':'collapsed')} aria-label="Chat tổng trong phòng">
    <button type="button" className="chat-heading" aria-expanded={open} aria-controls="chat-content" onClick={onToggle}><span className="chat-icon">☏</span><span>Chat tổng<small>Cùng người trong phòng</small></span>{!open&&unread>0&&<b className="chat-badge">{unread}</b>}<span className="chat-chevron">{open?'−':'＋'}</span></button>
    {open&&<div id="chat-content"><div className="chat-log" ref={log} role="log" aria-live="polite" aria-relevant="additions" onScroll={()=>{const el=log.current;if(el)follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<45;}}>
      {messages.length===0?<div className="chat-empty"><span>✧</span><p>Một lời chào, thêm một người bạn.</p><small>Gửi lời an lành đến mọi người trong phòng.</small></div>:messages.map(m=><article key={m.id} className={'chat-message '+(m.senderId===selfId?'own':'')}><div><strong>{m.senderId===selfId?'Bạn':m.name}</strong><time dateTime={new Date(m.sentAt).toISOString()}>{new Date(m.sentAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</time></div><p>{m.text}</p></article>)}
    </div><form className="chat-form" onSubmit={submit}><label className="sr-only" htmlFor="chat-draft">Lời nhắn trong phòng</label><div className="chat-compose"><input ref={input} id="chat-draft" autoComplete="off" maxLength={240} placeholder={disabled?'Đang kết nối lại…':'Gửi một lời an lành…'} value={draft} disabled={disabled} onChange={e=>setDraft(e.target.value)}/><button type="submit" aria-label="Gửi tin nhắn" disabled={disabled||cooling||!draft.trim()}>↑</button></div><small><span>{cooling?'Chờ một nhịp…':'Enter để gửi · Lời nói dịu dàng'}</span><span>{draft.length}/240</span></small></form></div>}
  </section>;
}
