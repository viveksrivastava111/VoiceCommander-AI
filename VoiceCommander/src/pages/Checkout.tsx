import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Clock3, MapPin, ShieldCheck } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useProductStore } from '../store/useProductStore';
import { useUserStore } from '../store/useUserStore';
import { money } from '../utils/speech';
import { useNavigate } from 'react-router-dom';
import type { Address } from '../types';

const empty = (): Address => ({ name:'', phone:'', line1:'', line2:'', city:'', state:'', pincode:'', label:'Home', isDefault:true });

export default function Checkout(){
 const nav=useNavigate();
 const items=useCartStore(s=>s.items);
 const complete=useCartStore(s=>s.completeOrder);
 const addToHistory=useProductStore(s=>s.addToHistory);
 const products=useProductStore(s=>s.products);
 const profile=useUserStore(s=>s.profile);
 const addAddress=useUserStore(s=>s.addAddress);
 const updateAddress=useUserStore(s=>s.updateAddress);
 const defaultAddress=useMemo(()=>profile?.addresses.find(a=>a.isDefault)||profile?.addresses[0], [profile]);
 const initial=useMemo(()=>defaultAddress?{...defaultAddress}:{...empty(),name:profile?.name||'',phone:profile?.phone||''},[defaultAddress,profile?.name,profile?.phone]);
 const[a,setA]=useState<Address>(initial);
 const[step,setStep]=useState<1|2>(1);
 const[completedStatus,setCompletedStatus]=useState<'Pending'|'Confirmed'|null>(null);
 useEffect(()=>setA(initial),[initial]);
 const subtotal=items.reduce((s,i)=>s+(products.find(p=>p.id===i.productId)?.price||0)*i.quantity,0);
 const delivery=subtotal>=499?0:items.length?40:0;
 const total=subtotal+delivery;
 const set=(k:keyof Address,v:string)=>setA(prev=>({...prev,[k]:v} as Address));
 const valid=Boolean(a.name&&a.phone&&a.line1&&a.city&&a.state&&a.pincode);
 const saveAndContinue=()=>{const address={...a,isDefault:true};if(address.id)updateAddress(address.id,address);else addAddress(address);setStep(2)};
 const placeOrder=async(status:'Pending'|'Confirmed')=>{
   if(!items.length || completedStatus) return;
   const order=complete(total,status,{...a});
   if(!order) return;
   addToHistory(order.items||items);
   setCompletedStatus(status);
   setTimeout(()=>nav(`/orders/${order.id}`),850);
 };
 return <div className="page max-w-3xl">
  <h1 className="text-3xl font-extrabold">Checkout</h1>
  <div className="mt-5 flex gap-2">
   <button onClick={()=>setStep(1)} className={`flex-1 rounded-lg p-3 text-sm font-bold ${step===1?'bg-brand-500 text-white':'bg-white border'}`}>1. Address</button>
   <button disabled={!valid} onClick={()=>setStep(2)} className={`flex-1 rounded-lg p-3 text-sm font-bold ${step===2?'bg-brand-500 text-white':'bg-white border'}`}>2. Payment</button>
  </div>
  {step===1?<section className="card mt-5 p-5">
   <h2 className="mb-2 flex items-center gap-2 font-extrabold"><MapPin size={20}/>Delivery address</h2>
   <p className="mb-4 text-xs text-gray-500">Your default profile address is automatically selected here.</p>
   <div className="grid gap-3 sm:grid-cols-2">{(['name','phone','line1','line2','city','state','pincode'] as const).map(k=><label key={k} className={k==='line1'||k==='line2'?'sm:col-span-2':''}><span className="mb-1 block text-xs font-semibold capitalize">{k==='line1'?'Address line 1':k==='line2'?'Address line 2':k}</span><input className="input" value={a[k]} onChange={e=>set(k,e.target.value)} placeholder={k==='phone'?'10-digit mobile number':''}/></label>)}</div>
   <button disabled={!valid} onClick={saveAndContinue} className="btn btn-primary mt-5 w-full disabled:bg-gray-300">Save & Continue</button>
  </section>:<div className="mt-5 grid gap-5 md:grid-cols-2">
   <section className="card p-5"><h2 className="font-extrabold">Order summary</h2><div className="mt-4 space-y-3 text-sm"><p className="flex justify-between"><span>Subtotal</span><b>{money(subtotal)}</b></p><p className="flex justify-between"><span>Delivery</span><b>{delivery?money(delivery):'FREE'}</b></p><p className="flex justify-between border-t pt-3 text-lg"><b>Total</b><b>{money(total)}</b></p></div></section>
   <section className="rounded-xl bg-gray-950 p-5 text-white shadow-card">
    <div className="flex items-center justify-between"><div><p className="font-bold">VoiceCart AI Pay</p><p className="text-xs text-gray-400">Accepted Here</p></div><ShieldCheck className="text-green-400"/></div>
    <p className="mt-5 text-center text-sm">Scan & pay securely with any UPI app</p>
    <div className="mx-auto mt-4 flex w-fit items-center justify-center rounded-xl bg-white p-4"><QRCodeSVG value={`upi://pay?pa=demo@upi&pn=VoiceCart AI&am=${total.toFixed(2)}&cu=INR`} size={180}/></div>
    <p className="mt-4 text-center text-2xl font-extrabold">{money(total)}</p>
    <button onClick={()=>placeOrder('Confirmed')} disabled={!items.length||!!completedStatus} className="btn mt-5 w-full bg-green-500 text-white disabled:opacity-60">{completedStatus==='Confirmed'?<><Check/>Payment confirmed</>:<>I have done the payment</>}</button>
    <button onClick={()=>placeOrder('Pending')} disabled={!items.length||!!completedStatus} className="btn mt-3 w-full border border-gray-600 bg-transparent text-white disabled:opacity-60">{completedStatus==='Pending'?<><Clock3 size={16}/>Order pending</>:<>Place order without confirming payment</>}</button>
    <p className="mt-3 text-center text-[11px] text-gray-400">If you confirm that you have paid, the order is marked <b>Confirmed</b>. Otherwise it is placed as <b>Pending</b>.</p>
    <p className="mt-2 text-center text-[11px] text-gray-400">Demo QR only. No real payment details are used.</p>
   </section>
  </div>}
 </div>;
}
