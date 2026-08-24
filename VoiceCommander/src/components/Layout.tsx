import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Heart, Mic, Search, ShoppingCart, UserCircle, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import BottomNav from './BottomNav';
import VoiceAssistantDrawer from './VoiceAssistantDrawer';
import ProfileDropdown from './ProfileDropdown';
import { storefrontCategories } from '../data/mockData';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { useProductStore } from '../store/useProductStore';

export default function Layout(){
 const [drawer,setDrawer]=useState(false); const [search,setSearch]=useState(''); const [profileOpen,setProfileOpen]=useState(false); const profileRef=useRef<HTMLDivElement>(null); const navigate=useNavigate();
 const cartCount=useCartStore(s=>s.items.reduce((n,i)=>n+i.quantity,0)); const authUser=useAuthStore(s=>s.user); const profile=useUserStore(s=>s.profile); const ensureProfile=useUserStore(s=>s.ensureProfile);
 useEffect(()=>{ensureProfile(authUser)},[authUser,ensureProfile]);
 useEffect(()=>{const open=()=>setDrawer(true);window.addEventListener('open-voice-assistant',open);return()=>window.removeEventListener('open-voice-assistant',open)},[]);
 useEffect(()=>{const close=(event:MouseEvent)=>{if(profileRef.current&&!profileRef.current.contains(event.target as Node))setProfileOpen(false)};window.addEventListener('mousedown',close);return()=>window.removeEventListener('mousedown',close)},[]);
 const recordSearch=useProductStore(s=>s.setSearchQuery);
 const submit=(value:string)=>{const clean=value.trim();if(clean)recordSearch(clean);navigate(clean?`/products?search=${encodeURIComponent(clean)}`:'/products')};
 const displayName=profile?.name?.trim() || authUser?.name || 'Guest';
 return <div className="app-shell"><header className="topbar"><Link to="/home" className="brand"><ShoppingCart size={21}/><span>VoiceCart AI</span></Link><div className="desktop-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for products, brands and more..." onKeyDown={e=>{if(e.key==='Enter')submit(e.currentTarget.value)}}/><button type="button" onClick={()=>setDrawer(true)} aria-label="Open voice assistant"><Mic size={16}/></button></div><div className="top-actions"><Heart size={19}/><Link to="/cart" className="relative"><ShoppingCart size={19}/>{cartCount>0&&<span className="cart-dot">{cartCount}</span>}</Link><div className="profile-trigger-wrap" ref={profileRef}><button type="button" className="profile-trigger" onClick={()=>setProfileOpen(v=>!v)} aria-expanded={profileOpen} aria-label="Open profile menu"><UserCircle size={23}/><span className="user-name">{displayName}</span><ChevronDown size={14} className={profileOpen?'chevron-up':''}/></button>{profileOpen&&<ProfileDropdown profile={profile} onClose={()=>setProfileOpen(false)}/>}</div></div></header><div className="desktop-body"><aside className="category-sidebar"><Link to="/products" className="category-title">⌘ &nbsp; All Categories</Link>{storefrontCategories.map(c=><Link key={c.label} className="category-link" to={`/products?category=${encodeURIComponent(c.label)}`}>{c.label}</Link>)}<button className="category-link" onClick={()=>setDrawer(true)}>◉ Voice Assistant</button></aside><main className="app-content"><Outlet/></main></div><BottomNav/>{drawer&&<VoiceAssistantDrawer onClose={()=>setDrawer(false)}/>}</div>
}
