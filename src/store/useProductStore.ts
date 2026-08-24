import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, PurchaseHistory } from '../types';
import { mockProducts } from '../data/mockData';
import { syncShoppingData } from '../lib/cloudData';

interface ProductState {
  products: Product[];
  history: PurchaseHistory[];
  searches: string[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  language: string;
  setLanguage: (lang: string) => void;
  setSearchQuery: (query: string) => void;
  hydrateShopping: (history: PurchaseHistory[], searches: string[]) => void;
  fetchProducts: () => Promise<void>;
  searchProducts: (query: string, priceMax?: number, priceMin?: number, brand?: string) => Product[];
  getRecommendations: () => Array<{ product: Product; reason: string }>;
  getSeasonalProducts: () => Product[];
  getSubstitutes: (productId: string) => Product[];
  addToHistory: (cartItems: any[]) => void;
}

export const useProductStore = create<ProductState>()(
  persist(
    (_set, get) => ({
      products: [],
      history: [],
      searches: [],
      searchQuery: '',
      isLoading: false,
      error: null,
      language: 'en-IN',
      setLanguage: (lang: string) => _set({ language: lang }),
      setSearchQuery: (query: string) => { const clean=query.trim(); _set(state=>{ const searches=clean?[clean,...state.searches.filter(x=>x.toLowerCase()!==clean.toLowerCase())].slice(0,30):state.searches; syncShoppingData(state.history,searches); return {searchQuery:query,searches}; }); },
      hydrateShopping: (history, searches) => _set({ history, searches }),

      fetchProducts: async () => {
        _set({ isLoading: true, error: null });
        try {
          const res = await fetch('https://dummyjson.com/products?limit=100');
          if (!res.ok) throw new Error('Failed to fetch products');
          const data = await res.json();
          const normalizeCategory = (raw: string) => {
            const value = raw.toLowerCase();
            if (/beauty|skin|fragrance/.test(value)) return 'Personal Care';
            if (/grocer|food|vegetable|fruit/.test(value)) return 'Produce';
            if (/drink|beverage/.test(value)) return 'Beverages';
            if (/kitchen|home|furniture/.test(value)) return 'Household';
            return 'Other';
          };
          // Keep the fetched catalog capped so local + remote data lands close to 400 products.
          const fetchedProducts: Product[] = data.products.slice(0, 100).map((p: any) => ({
            id: `api-${p.id}`,
            name: p.title,
            brand: p.brand || 'Generic',
            category: normalizeCategory(p.category || ''),
            subcategory: p.category || 'Featured',
            productType: p.category || 'product',
            price: Math.round(p.price * 10),
            originalPrice: Math.round(p.price * 12),
            unit: 'item',
            size: '1 pc',
            image: p.thumbnail,
            tags: [...(p.tags || []), p.category || 'product'],
            seasonal: false,
            available: p.stock > 0,
            substitutes: [],
          }));

          // Combine custom catalog (Sensodyne, Amul, Colgate, etc.) with fetched API products
          const combinedProducts = [...mockProducts];
          fetchedProducts.forEach(p => {
            if (!combinedProducts.some(existing => existing.id === p.id)) {
              combinedProducts.push(p);
            }
          });

          _set({ products: combinedProducts, isLoading: false });
        } catch (err: any) {
          _set({ products: mockProducts, error: err.message || 'Error fetching products', isLoading: false });
        }
      },

      searchProducts: (query: string, priceMax?: number, priceMin?: number, brand?: string) => {
        const q = query.toLowerCase();
        let results = get().products;

        if (q) {
          results = results.filter((p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.tags.some(tag => tag.toLowerCase().includes(q))
          );
        }
        if (priceMax) results = results.filter(p => p.price <= priceMax);
        if (priceMin) results = results.filter(p => p.price >= priceMin);
        if (brand) results = results.filter(p => p.brand.toLowerCase().includes(brand.toLowerCase()));

        return results;
      },

      getRecommendations: () => {
        const { products, history, searches } = get();
        const scored: Array<{ product: Product; score: number; reason: string }> = [];
        const searchText = searches.join(' ').toLowerCase();
        products.forEach(p => {
          if (!p.available) return;
          let score = 0; let reason = '';
          const hist = history.find(h => h.productId === p.id);
          if (hist) { score += hist.purchaseCount * 5; reason = hist.purchaseCount > 1 ? `Bought ${hist.purchaseCount} times` : 'Previously ordered'; }
          if (searchText && [p.name,p.brand,p.category,p.subcategory||'',...p.tags].join(' ').toLowerCase().split(/\s+/).some(word => word.length>2 && searchText.includes(word))) { score += 4; if (!reason) reason='Based on your recent searches'; }
          if (p.seasonal) { score += 2; if (!reason) reason='Popular seasonal choice'; }
          if (score>0) scored.push({product:p,score,reason});
        });
        scored.sort((a,b)=>b.score-a.score);
        if(scored.length) return scored.slice(0,12);
        const perCategory = new Map<string, number>();
        return products.filter(p=>p.available).filter(p=>{const count=perCategory.get(p.category)||0;if(count>=2)return false;perCategory.set(p.category,count+1);return true;}).slice(0,16).map(product=>({product,score:0,reason:'A popular pick to get you started'}));
      },

      getSeasonalProducts: () => {
        return get().products.filter(p => p.seasonal && p.available);
      },

      getSubstitutes: (productId: string) => {
        const { products } = get();
        const product = products.find(p => p.id === productId);
        if (!product) return [];
        const explicit = product.substitutes.map(id => products.find(p => p.id === id)).filter((p): p is Product => !!p && p.available);
        if (explicit.length) return explicit;
        const type = product.productType || product.tags.find(t => ['milk','toothpaste','water','bread','rice','shampoo','egg','apple','banana'].includes(t.toLowerCase())) || product.name.toLowerCase().split(' ').slice(-1)[0];
        return products.filter(p => p.id !== product.id && p.available && ((p.productType && p.productType === type) || p.tags.some(t => t.toLowerCase() === String(type).toLowerCase()))).sort((a,b)=>a.price-b.price).slice(0,4);
      },

      addToHistory: (cartItems: any[]) => {
        const { history } = get();
        const updatedHistory = [...history];

        cartItems.forEach(item => {
          const index = updatedHistory.findIndex(h => h.productId === item.productId);
          if (index !== -1) {
            const hist = updatedHistory[index];
            updatedHistory[index] = {
              ...hist,
              purchaseCount: hist.purchaseCount + 1,
              lastPurchased: Date.now(),
              averageQuantity: Math.round((hist.averageQuantity * hist.purchaseCount + item.quantity) / (hist.purchaseCount + 1)),
            };
          } else {
            updatedHistory.push({
              productId: item.productId,
              productName: item.name,
              purchaseCount: 1,
              lastPurchased: Date.now(),
              averageQuantity: item.quantity,
            });
          }
        });

        _set({ history: updatedHistory });
        syncShoppingData(updatedHistory, get().searches);
      }
    }),
    {
      name: 'voicecart-products',
      partialize: (state) => ({ history: state.history, searches: state.searches, language: state.language }),
    }
  )
);
