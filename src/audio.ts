let context:AudioContext|undefined;
let ambience: {nodes:OscillatorNode[];gain:GainNode}|undefined;
export function unlockAudio(){context??=new AudioContext();void context.resume();}
export function tone(kind:'bell'|'wood'|'templeBell'){
  if(!context)return;const now=context.currentTime;
  const large=kind==='templeBell';const frequencies=large?[174,286,409,563,811]:kind==='bell'?[396,792,1091]:[390,610];const decay=large?6:kind==='bell'?3:.16;
  frequencies.forEach((frequency,i)=>{const oscillator=context!.createOscillator(),gain=context!.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime((large?.13:kind==='bell'?.12:.2)/(i+1),now+0.004);gain.gain.exponentialRampToValueAtTime(0.001,now+decay);oscillator.connect(gain).connect(context!.destination);oscillator.start();oscillator.stop(now+decay+.1);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};});
}
export function ambient(enabled:boolean){
  if(ambience){ambience.nodes.forEach(n=>{n.stop();n.disconnect();});ambience.gain.disconnect();ambience=undefined;}
  if(!enabled)return;unlockAudio();const gain=context!.createGain();gain.gain.value=0.018;gain.connect(context!.destination);
  const nodes=[130.81,196,261.63].map(f=>{const o=context!.createOscillator();o.frequency.value=f;o.connect(gain);o.start();return o;});ambience={nodes,gain};
}
