import { Home, Search, ShoppingBasket, PackageCheck, ShoppingCart } from 'lucide-react';
import { NavLink } from 'react-router-dom';
const items=[['/home','Home',Home],['/products','Products',Search],['/cart','Cart',ShoppingCart],['/orders','Orders',PackageCheck],['/history','History',ShoppingBasket]] as const;
export default function BottomNav(){return <nav className="bottom-nav"><div>{items.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</div></nav>}
