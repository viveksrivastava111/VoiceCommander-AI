export function speak(text:string){ if(!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=.98; u.pitch=1; window.speechSynthesis.speak(u); }
export const money=(n:number)=>`₹${Math.round(n).toLocaleString('en-IN')}`;
