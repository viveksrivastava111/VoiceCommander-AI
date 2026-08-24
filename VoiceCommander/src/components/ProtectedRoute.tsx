import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
export default function ProtectedRoute(){const user=useAuthStore(s=>s.user);const initialized=useAuthStore(s=>s.initialized);if(!initialized)return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Loading VoiceCart AI…</div>;return user?<Outlet/>:<Navigate to="/login" replace/>}
