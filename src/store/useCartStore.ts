import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, Order, OrderStatus } from '../types';
import { useProductStore } from '../store/useProductStore';
import { mockProducts } from '../data/mockData';
import { syncOrders } from '../lib/cloudData';

interface CartState {
  items: CartItem[];
  budget: number | null;
  orders: Order[];
  setBudget: (budget: number | null) => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleComplete: (productId: string) => void;
  clearCart: () => void;
  optimizeCart: () => { swaps: Array<{ from: string; to: string; saved: number }>; totalSaved: number };
  completeOrder: (total: number, status?: Extract<OrderStatus, 'Pending' | 'Confirmed'>, address?: import('../types').Address) => Order | null;
  hydrateOrders: (orders: Order[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      budget: null,
      orders: [],
      setBudget: (budget) => set({ budget }),
      addItem: (product, quantity = 1) => set((state) => {
        const existingItem = state.items.find((item) => item.productId === product.id);
        if (existingItem) {
          return {
            items: state.items.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          };
        }
        const newItem: CartItem = {
          id: Math.random().toString(36).substring(7),
          productId: product.id,
          name: product.name,
          quantity,
          unit: product.unit,
          category: product.category,
          completed: false,
          addedAt: Date.now(),
        };
        return { items: [...state.items, newItem] };
      }),
      removeItem: (productId) => set((state) => ({
        items: state.items.filter((item) => item.productId !== productId),
      })),
      updateQuantity: (productId, quantity) => set((state) => ({
        items: state.items.map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
        ),
      })),
      toggleComplete: (productId) => set((state) => ({
        items: state.items.map((item) =>
          item.productId === productId ? { ...item, completed: !item.completed } : item
        ),
      })),
      clearCart: () => set({ items: [] }),
      completeOrder: (total, status = 'Pending', address) => { const state=useCartStore.getState(); if(!state.items.length)return null; const order:Order={id:`VOC-${Date.now().toString(36).toUpperCase()}`,createdAt:Date.now(),total,itemCount:state.items.length,status,address,items:state.items.map(item=>({...item}))}; const orders=[order,...state.orders]; set({orders,items:[]}); syncOrders(orders); return order; },
hydrateOrders: (orders) =>
  set({
    orders: orders.map(order => ({
      ...order,
      status:
        ((order.status as string) === 'Paid'
          ? 'Confirmed'
          : order.status) as OrderStatus,
    })),
  }),
      optimizeCart: () => {
        const storeProducts = useProductStore.getState().products;
        const allCatalogProducts = [...mockProducts];
        storeProducts.forEach(sp => {
          if (!allCatalogProducts.some(p => p.id === sp.id)) {
            allCatalogProducts.push(sp);
          }
        });

        const currentItems = useCartStore.getState().items;
        const swaps: Array<{ from: string; to: string; saved: number }> = [];
        let totalSaved = 0;

        // Specific product noun keywords for strict 1-to-1 equivalence matching
        const NOUN_PATTERNS = [
          { noun: 'milk', pattern: /\b(milk|doodh)\b/i },
          { noun: 'water', pattern: /\b(water|pani)\b/i },
          { noun: 'toothpaste', pattern: /\b(toothpaste|dental)\b/i },
          { noun: 'coffee', pattern: /\b(coffee|nescafe|espresso)\b/i },
          { noun: 'tea', pattern: /\b(tea|chai)\b/i },
          { noun: 'apple', pattern: /\b(apple|apples|seb)\b/i },
          { noun: 'banana', pattern: /\b(banana|bananas|kela)\b/i },
          { noun: 'mango', pattern: /\b(mango|mangoes|aam)\b/i },
          { noun: 'strawberry', pattern: /\b(strawberry|strawberries)\b/i },
          { noun: 'cheese', pattern: /\b(cheese|paneer)\b/i },
          { noun: 'oil', pattern: /\b(oil|tel)\b/i },
          { noun: 'bread', pattern: /\b(bread|toast)\b/i },
          { noun: 'rice', pattern: /\b(rice|chawal|basmati)\b/i },
          { noun: 'chicken', pattern: /\b(chicken)\b/i },
          { noun: 'fish', pattern: /\b(fish|steak)\b/i },
          { noun: 'shampoo', pattern: /\b(shampoo)\b/i },
          { noun: 'soap', pattern: /\b(soap|hand wash)\b/i },
        ];

        const updatedItems = currentItems.map(item => {
          const currentProduct = allCatalogProducts.find(
            p => p.id === item.productId || p.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(p.name.toLowerCase())
          ) || {
            id: item.productId,
            name: item.name,
            brand: 'Generic',
            category: item.category || 'Pantry',
            price: 100,
            unit: item.unit || 'item',
            size: '1 pc',
            image: '',
            tags: [item.name.toLowerCase()],
            seasonal: false,
            available: true,
            substitutes: [],
          };

          let candidate: Product | null = null;

          // 1. Check explicit substitutes defined on the product first
          if (currentProduct.substitutes && currentProduct.substitutes.length > 0) {
            const cheaperSubs = currentProduct.substitutes
              .map(subId => allCatalogProducts.find(p => p.id === subId))
              .filter((p): p is Product => !!p && p.available && p.price < currentProduct.price)
              .sort((a, b) => a.price - b.price);

            if (cheaperSubs.length > 0) {
              candidate = cheaperSubs[0];
            }
          }

          // 2. Strict Same-Noun Keyword Matching (e.g. Milk MUST swap with Milk, Toothpaste MUST swap with Toothpaste)
          if (!candidate) {
            const itemText = (currentProduct.name + ' ' + (currentProduct.tags || []).join(' ')).toLowerCase();

            // Identify the exact noun category of this item (e.g. "milk", "toothpaste", "apple")
            const matchedNoun = NOUN_PATTERNS.find(np => np.pattern.test(itemText));

            if (matchedNoun) {
              // Search ONLY for cheaper products that match the EXACT SAME product noun!
              const cheaperNounMatches = allCatalogProducts.filter(p => {
                if (!p.available || p.id === currentProduct.id || p.price >= currentProduct.price) return false;
                const candText = (p.name + ' ' + (p.tags || []).join(' ')).toLowerCase();
                return matchedNoun.pattern.test(candText);
              });

              if (cheaperNounMatches.length > 0) {
                cheaperNounMatches.sort((a, b) => a.price - b.price);
                candidate = cheaperNounMatches[0];
              }
            }
          }

          // Apply swap ONLY if a genuine cheaper alternative of the EXACT SAME product noun was found
          if (candidate) {
            const saved = (currentProduct.price - candidate.price) * item.quantity;
            totalSaved += saved;
            swaps.push({ from: currentProduct.name, to: candidate.name, saved });
            return {
              ...item,
              productId: candidate.id,
              name: candidate.name,
              unit: candidate.unit,
              category: candidate.category,
            };
          }

          return item;
        });

        if (swaps.length > 0) {
          set({ items: updatedItems });
        }
        return { swaps, totalSaved };
      },
    }),
    {
      name: 'vocacart-cart',
      version: 2,
      migrate: (persistedState: any) => ({
        ...persistedState,
        orders: (persistedState?.orders || []).map((order: any) => ({
          ...order,
          status: (order.status === 'Paid' ? 'Confirmed' : order.status) as OrderStatus,
        })),
      }),
    }
  )
);
