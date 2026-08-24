import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useProductStore } from './store/useProductStore';
import { useCartStore } from './store/useCartStore';
import { useUserStore } from './store/useUserStore';
import { useAuthStore } from './store/useAuthStore';
import { loadCloudData } from './lib/cloudData';
import Layout from './components/Layout'; import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing'; import Home from './pages/Home'; import Discover from './pages/Discover'; import ShoppingList from './pages/ShoppingList'; import Checkout from './pages/Checkout'; import History from './pages/History'; import ProductDetails from './pages/ProductDetails'; import Orders from './pages/Orders'; import OrderDetails from './pages/OrderDetails'; import Profile from './pages/Profile';

function Bootstrap(){
 const fetchProducts=useProductStore(s=>s.fetchProducts); const hydrateShopping=useProductStore(s=>s.hydrateShopping); const hydrateOrders=useCartStore(s=>s.hydrateOrders); const hydrateProfile=useUserStore(s=>s.hydrateProfile); const initialize=useAuthStore(s=>s.initialize); const user=useAuthStore(s=>s.user);
 useEffect(()=>{fetchProducts(); initialize();},[fetchProducts,initialize]);
 useEffect(()=>{ if(!user || user.provider==='guest') return; loadCloudData(user.uid).then(data=>{ if(!data){ hydrateOrders([]); hydrateShopping([],[]); return; } if(data.profile) hydrateProfile(data.profile); if(Array.isArray(data.orders)) hydrateOrders(data.orders); else hydrateOrders([]); hydrateShopping(Array.isArray(data.history)?data.history:[],Array.isArray(data.searches)?data.searches:[]); }); },[user?.uid,user?.provider,hydrateShopping,hydrateOrders,hydrateProfile]);
 return null;
}
export default function App(){return <BrowserRouter><Bootstrap/><Routes><Route path="/login" element={<Landing/>}/><Route element={<ProtectedRoute/>}><Route element={<Layout/>}><Route path="/home" element={<Home/>}/><Route path="/products" element={<Discover/>}/><Route path="/products/:id" element={<ProductDetails/>}/><Route path="/cart" element={<ShoppingList/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/orders" element={<Orders/>}/><Route path="/orders/:id" element={<OrderDetails/>}/><Route path="/history" element={<History/>}/><Route path="/profile" element={<Profile/>}/></Route></Route><Route path="/" element={<Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to="/login" replace/>}/></Routes></BrowserRouter>}
