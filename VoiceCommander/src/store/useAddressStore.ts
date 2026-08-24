import { create } from 'zustand'; import { persist } from 'zustand/middleware'; import { Address } from '../types';
interface S { address:Address|null; setAddress:(a:Address)=>void; clearAddress:()=>void }
export const useAddressStore=create<S>()(persist(set=>({address:null,setAddress:(address)=>set({address}),clearAddress:()=>set({address:null})}),{name:'vocacart-address'}));
