import { MapPin, Package, Settings, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../types';

interface Props { profile: UserProfile | null; onClose: () => void; }

export default function ProfileDropdown({ profile, onClose }: Props) {
  return <div className="profile-menu" role="menu">
    <div className="profile-menu-head">
      <div className="profile-avatar">{(profile?.name || 'G').trim().charAt(0).toUpperCase()}</div>
      <div><b>{profile?.name || 'Guest'}</b><span>{profile?.email || 'Complete your profile'}</span></div>
    </div>
    <div className="profile-menu-links">
      <Link to="/profile" onClick={onClose}><UserCircle size={17}/>My Profile</Link>
      <Link to="/orders" onClick={onClose}><Package size={17}/>My Orders</Link>
      <Link to="/profile?tab=addresses" onClick={onClose}><MapPin size={17}/>Saved Addresses</Link>
      <Link to="/profile?tab=settings" onClick={onClose}><Settings size={17}/>Account Settings</Link>
    </div>
  </div>;
}
