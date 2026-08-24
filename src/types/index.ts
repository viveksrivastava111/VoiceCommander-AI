export type Category = string;

export interface Product { id:string; name:string; brand:string; category:Category; subcategory?:string; productType?:string; price:number; originalPrice?:number; unit:string; size:string; image:string; tags:string[]; seasonal:boolean; available:boolean; substitutes:string[] }
export interface CartItem { id:string; productId:string; name:string; quantity:number; unit:string; category:Category; completed:boolean; addedAt:number }
export interface PurchaseHistory { productId:string; productName:string; purchaseCount:number; lastPurchased:number; averageQuantity:number }

export type AddressType = 'Home'|'Work'|'Other';
export interface Address { id?:string; label?:AddressType; isDefault?:boolean; name:string; phone:string; line1:string; line2:string; landmark?:string; city:string; state:string; pincode:string }
export interface UserProfile { name:string; email:string; phone:string; gender:string; dateOfBirth:string; addresses:Address[] }

export type OrderStatus = 'Pending'|'Confirmed'|'Delivered'|'Cancelled';
export interface Order { id:string; createdAt:number; total:number; itemCount:number; status:OrderStatus; items?:CartItem[]; address?:Address }
export type Intent='ADD_ITEM'|'MULTI_ADD'|'REMOVE_ITEM'|'UPDATE_QUANTITY'|'SEARCH_PRODUCT'|'FILTER_PRODUCTS'|'SHOW_LIST'|'CLEAR_LIST'|'MARK_COMPLETE'|'GET_RECOMMENDATIONS'|'GET_SUBSTITUTES'|'SET_BUDGET'|'OPTIMIZE_CART'|'COOK_RECIPE'|'PROCEED_CHECKOUT'|'CONFIRM_PAYMENT'|'UNKNOWN';
export interface VoiceOrderItem { product:string; quantity:number; unit?:string }
export interface NLPResult { intent:Intent; product?:string; quantity?:number; unit?:string; items?:VoiceOrderItem[]; brand?:string; category?:string; priceMin?:number; priceMax?:number; budgetAmount?:number; recipeName?:string; rawText:string }
export interface User { uid:string; name:string; email:string; provider:'email'|'google'|'guest'; isPrime:boolean }
