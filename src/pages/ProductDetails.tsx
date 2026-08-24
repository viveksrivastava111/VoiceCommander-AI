import { ChevronRight, Heart, Minus, Plus, Star, Truck, ShieldCheck, RotateCcw, ShoppingBag, Zap, Check, PackageCheck } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '../store/useProductStore';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { money } from '../utils/speech';
import { useMemo, useState } from 'react';
import ProductCard from '../components/ProductCard';

function makeVariants(size:string, price:number){
  const parsed=size.match(/(\d+(?:\.\d+)?)\s*(kg|g|litre|l|ml|pieces?|bags?)/i);
  if(!parsed) return [{label:size,price,multiplier:1},{label:'Value Pack',price:Math.round(price*1.8),multiplier:2}];
  const amount=Number(parsed[1]); const raw=parsed[2].toLowerCase();
  const unit=raw==='litre'?'L':raw;
  if(unit==='kg') return [{label:`${Math.max(amount/2,.5)} kg`,price:Math.round(price*.55),multiplier:.5},{label:size,price,multiplier:1},{label:`${amount*2} kg`,price:Math.round(price*1.85),multiplier:2}];
  if(unit==='l'||unit==='ml') return [{label:unit==='ml'?`${Math.max(amount/2,100)} ml`:`${Math.max(amount/2,.5)} L`,price:Math.round(price*.55),multiplier:.5},{label:size,price,multiplier:1},{label:unit==='ml'?`${amount*2} ml`:`${amount*2} L`,price:Math.round(price*1.85),multiplier:2}];
  return [{label:size,price,multiplier:1},{label:`2 × ${size}`,price:Math.round(price*1.8),multiplier:2}];
}

export default function ProductDetails(){
  const {id}=useParams(); const navigate=useNavigate();
  const products=useProductStore(s=>s.products); const add=useCartStore(s=>s.addItem);
  const user=useAuthStore(s=>s.user);
  const [qty,setQty]=useState(1); const [selectedVariant,setSelectedVariant]=useState(1); const [saved,setSaved]=useState(false);
  const p=products.find(x=>x.id===id);
  const variants=useMemo(()=>p?makeVariants(p.size,p.price):[],[p]);
  if(!p) return <div className="page"><div className="empty-state"><PackageCheck size={36}/><h2>Product not found</h2><Link className="btn btn-primary" to="/products">Browse products</Link></div></div>;
  const variant=variants[selectedVariant]||variants[0]; const currentPrice=variant.price; const original=selectedVariant===1?p.originalPrice:undefined;
  const discount=original?Math.round((1-currentPrice/original)*100):p.originalPrice?Math.round((1-p.price/p.originalPrice)*100):0;
  const deliveryDays=user?.isPrime?1:3;
  const similar=products.filter(x=>x.id!==p.id && (x.productType&&p.productType?x.productType===p.productType:(x.category===p.category && (x.subcategory===p.subcategory || x.unit===p.unit)))).slice(0,5);
  const addCurrent=()=>add(p,qty);
  const buyNow=()=>{add(p,qty);navigate('/checkout')};
  return <div className="page product-detail-page">
    <div className="breadcrumbs"><Link to="/home">Home</Link><ChevronRight size={14}/><Link to={`/products?category=${encodeURIComponent(p.category)}`}>{p.category}</Link><ChevronRight size={14}/><span>{p.name}</span></div>
    <div className="details-layout enhanced-details">
      <section className="details-gallery"><div className="details-image"><img src={p.image} alt={p.name}/>{!p.available&&<span className="unavailable-overlay">Currently unavailable</span>}</div><div className="thumb-row"><button className="active-thumb"><img src={p.image} alt="Product thumbnail"/></button></div></section>
      <section className="details-info">
        <p className="eyebrow">{p.brand} · {p.category}</p><h1>{p.name}</h1>
        <div className="rating"><span className="rating-pill"><Star size={14} fill="currentColor"/> 4.7</span><span>241 verified ratings</span></div>
        <div className="detail-price"><b>{money(currentPrice)}</b>{original&&<del>{money(original)}</del>}{discount>0&&<em>{discount}% OFF</em>}</div>
        <p className="detail-copy">{p.name} is a quality everyday essential, carefully selected and securely packed for reliable delivery to your doorstep.</p>
        <div className="variant-title">Select variant</div><div className="variants">{variants.map((v,i)=><button key={`${v.label}-${i}`} onClick={()=>setSelectedVariant(i)} className={i===selectedVariant?'selected':''}>{v.label}<br/><b>{money(v.price)}</b></button>)}</div>
        <div className="variant-title">Quantity</div><div className="purchase-row"><div className="qty"><button aria-label="Decrease quantity" onClick={()=>setQty(Math.max(1,qty-1))}><Minus size={15}/></button><span>{qty}</span><button aria-label="Increase quantity" onClick={()=>setQty(qty+1)}><Plus size={15}/></button></div><button className="wish" aria-label="Save product" onClick={()=>setSaved(!saved)}><Heart size={19} fill={saved?'currentColor':'none'}/></button></div>
        <div className="action-buttons"><button disabled={!p.available} className="add-main" onClick={addCurrent}><ShoppingBag size={17}/>{p.available?'Add to Cart':'Unavailable'}</button><button disabled={!p.available} className="buy-now" onClick={buyNow}><Zap size={17}/>Buy Now</button></div>
        <div className={`stock ${p.available?'':'stock-out'}`}>{p.available?'● In Stock · Ready to dispatch':'● Out of Stock'}</div>
      </section>
    </div>
    <section className="delivery-panel">
      <div className="delivery-title"><Truck size={22}/><div><h2>Delivery information</h2><p>Fast delivery options for this product</p></div></div>
      <div className="delivery-options">
        <div className={user?.isPrime?'delivery-option active':'delivery-option'}><Zap size={19}/><div><b>VoiceCart Prime</b><span>{user?.isPrime?`Get it delivered in ${deliveryDays} day`:'Get it delivered in 1 day with Prime'}</span></div>{user?.isPrime?<Check className="delivery-check" size={20}/>:<button onClick={()=>navigate('/login')}>View Prime</button>}</div>
        <div className={!user?.isPrime?'delivery-option active':'delivery-option'}><Truck size={19}/><div><b>Standard delivery</b><span>Get it delivered in {user?.isPrime?2:3} days</span></div>{!user?.isPrime&&<Check className="delivery-check" size={20}/>}</div>
        <div className="delivery-option"><ShieldCheck size={19}/><div><b>Secure packaging</b><span>Carefully packed and quality checked</span></div></div>
      </div>
      <div className="delivery-note"><RotateCcw size={16}/> Easy returns on eligible products · Free delivery on qualifying orders</div>
    </section>
    <section className="product-info-grid">
      <article className="product-description"><h2>About this product</h2><p>{p.name} from {p.brand} is selected for everyday quality and convenience. Store according to the packaging instructions and use before the stated best-before date.</p><ul><li>Quality checked before dispatch</li><li>Securely packed for delivery</li><li>Suitable for everyday use</li></ul></article>
      <article className="product-specs"><h2>Product details</h2><dl><dt>Brand</dt><dd>{p.brand}</dd><dt>Category</dt><dd>{p.category}</dd><dt>Product type</dt><dd>{p.productType||p.subcategory||p.unit}</dd><dt>Pack size</dt><dd>{variant.label}</dd><dt>Availability</dt><dd>{p.available?'In stock':'Currently unavailable'}</dd></dl></article>
    </section>
    {similar.length>0&&<section className="similar-section"><div className="section-head"><h2>Similar products</h2><Link to={`/products?category=${encodeURIComponent(p.category)}`}>View all</Link></div><div className="deal-strip">{similar.map(x=><ProductCard key={x.id} product={x}/>)}</div></section>}
  </div>
}
