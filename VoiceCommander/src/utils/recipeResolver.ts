import { Product } from '../types';

export interface GenericIngredient {
  product: Product;
  quantity: number;
}

// Non-food categories that must NEVER be added to a food recipe
const NON_FOOD_CATEGORIES = new Set([
  'beauty', 'fragrances', 'furniture', 'skin-care', 'laptops', 'smartphones', 'groceries-non-food'
]);

// Domain-aware dish mapping for common dishes (Indian, Western, Asian)
const COMMON_DISH_MAPPINGS: Array<{
  pattern: RegExp;
  items: Array<{ name: string; category: string; price: number; unit: string }>;
}> = [
  {
    pattern: /\b(maggie|maggi|noodle|noodles|ramen)\b/i,
    items: [
      { name: 'Maggi Masala Noodles', category: 'Pantry', price: 28, unit: 'packet' },
      { name: 'Mixed Vegetables & Seasoning', category: 'Produce', price: 35, unit: 'packet' },
    ],
  },
  {
    pattern: /\b(pancake|pancakes|waffle|waffles)\b/i,
    items: [
      { name: 'Wheat Flour', category: 'Pantry', price: 55, unit: 'kg' },
      { name: 'Full Cream Milk', category: 'Dairy', price: 65, unit: 'packet' },
      { name: 'Fresh Eggs', category: 'Dairy', price: 72, unit: 'dozen' },
      { name: 'Table Butter', category: 'Dairy', price: 55, unit: 'packet' },
    ],
  },
  {
    pattern: /\b(biryani|pulao|fried rice)\b/i,
    items: [
      { name: 'Basmati Rice', category: 'Pantry', price: 180, unit: 'kg' },
      { name: 'Biryani Spice Mix', category: 'Pantry', price: 45, unit: 'packet' },
      { name: 'Onions & Tomatoes', category: 'Produce', price: 40, unit: 'kg' },
      { name: 'Cooking Oil', category: 'Pantry', price: 140, unit: 'bottle' },
    ],
  },
  {
    pattern: /\b(pasta|spaghetti|macaroni)\b/i,
    items: [
      { name: 'Durum Wheat Pasta', category: 'Pantry', price: 95, unit: 'packet' },
      { name: 'Tomato Sauce & Basil', category: 'Pantry', price: 75, unit: 'bottle' },
      { name: 'Cheddar Cheese', category: 'Dairy', price: 120, unit: 'packet' },
    ],
  },
  {
    pattern: /\b(pizza)\b/i,
    items: [
      { name: 'Pizza Base Bread', category: 'Bakery', price: 45, unit: 'packet' },
      { name: 'Mozzarella Cheese', category: 'Dairy', price: 140, unit: 'packet' },
      { name: 'Pizza Sauce & Toppings', category: 'Pantry', price: 85, unit: 'bottle' },
    ],
  },
  {
    pattern: /\b(tea|chai|coffee)\b/i,
    items: [
      { name: 'Tea Leaves / Coffee Powder', category: 'Beverages', price: 120, unit: 'box' },
      { name: 'Full Cream Milk', category: 'Dairy', price: 65, unit: 'packet' },
      { name: 'Sugar', category: 'Pantry', price: 45, unit: 'kg' },
    ],
  },
  {
    pattern: /\b(smoothie|shake|juice)\b/i,
    items: [
      { name: 'Fresh Bananas', category: 'Produce', price: 40, unit: 'dozen' },
      { name: 'Full Cream Milk', category: 'Dairy', price: 65, unit: 'packet' },
      { name: 'Greek Yogurt', category: 'Dairy', price: 60, unit: 'cup' },
    ],
  },
  {
    pattern: /\b(salad)\b/i,
    items: [
      { name: 'Fresh Tomatoes', category: 'Produce', price: 30, unit: 'kg' },
      { name: 'Onions', category: 'Produce', price: 35, unit: 'kg' },
      { name: 'Fresh Spinach', category: 'Produce', price: 25, unit: 'bunch' },
    ],
  },
];

export function resolveIngredientsForDish(dishName: string, products: Product[]): GenericIngredient[] {
  const dishLower = dishName.toLowerCase().trim();

  // 1. Check domain-aware dish mappings first (Maggi, Biryani, Pancakes, Pasta, etc.)
  for (const mapping of COMMON_DISH_MAPPINGS) {
    if (mapping.pattern.test(dishLower)) {
      return mapping.items.map((item, idx) => ({
        product: {
          id: `recipe-item-${Date.now()}-${idx}`,
          name: item.name,
          brand: 'Kitchen Essentials',
          category: item.category,
          price: item.price,
          unit: item.unit,
          size: '1 pack',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
          tags: [dishLower, 'recipe', 'grocery'],
          seasonal: false,
          available: true,
          substitutes: [],
        },
        quantity: 1,
      }));
    }
  }

  // 2. Filter store products strictly to FOOD / GROCERY items (exclude beauty/fragrance/furniture)
  const foodProducts = products.filter(p => !NON_FOOD_CATEGORIES.has(p.category.toLowerCase()));

  // Search food products matching terms in the dish name
  const dishWords = dishLower.split(/\s+/).filter(w => w.length > 2 && !['want', 'make', 'cook', 'build', 'recipe', 'for', 'some', 'with'].includes(w));
  const matchedFoodProducts: Product[] = [];
  const addedIds = new Set<string>();

  for (const word of dishWords) {
    const found = foodProducts.find(p =>
      !addedIds.has(p.id) &&
      (p.name.toLowerCase().includes(word) ||
       p.tags.some(t => t.toLowerCase().includes(word)))
    );
    if (found) {
      addedIds.add(found.id);
      matchedFoodProducts.push(found);
    }
  }

  if (matchedFoodProducts.length > 0) {
    return matchedFoodProducts.map(product => ({ product, quantity: 1 }));
  }

  // 3. Fallback for any unknown food request (e.g. "make momos", "make tacos", "make curry")
  // Generate realistic food ingredients with the dish name
  const formattedDish = dishName.charAt(0).toUpperCase() + dishName.slice(1);
  return [
    {
      product: {
        id: `recipe-item-${Date.now()}-1`,
        name: `${formattedDish} Ingredients Pack`,
        brand: 'Fresh Grocery',
        category: 'Pantry',
        price: 90,
        unit: 'pack',
        size: '1 pc',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
        tags: [dishLower, 'recipe'],
        seasonal: false,
        available: true,
        substitutes: [],
      },
      quantity: 1,
    },
    {
      product: {
        id: `recipe-item-${Date.now()}-2`,
        name: `Cooking Oil & Spices`,
        brand: 'Kitchen Essentials',
        category: 'Pantry',
        price: 45,
        unit: 'pack',
        size: '1 pc',
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
        tags: ['spices', 'oil'],
        seasonal: false,
        available: true,
        substitutes: [],
      },
      quantity: 1,
    },
  ];
}
