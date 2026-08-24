import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Address, User, UserProfile } from '../types';
import { syncProfile } from '../lib/cloudData';

const blankProfile = (user: User): UserProfile => ({
  name: user.name || '',
  email: user.email || '',
  phone: '',
  gender: '',
  dateOfBirth: '',
  addresses: [],
});

interface UserState {
  profile: UserProfile | null;
  ensureProfile: (user: User | null) => void;
  updateProfile: (updates: Partial<Omit<UserProfile, 'addresses'>>) => void;
  addAddress: (address: Address) => void;
  updateAddress: (id: string, address: Address) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  hydrateProfile: (profile: UserProfile) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile: null,
      hydrateProfile: (profile) => set({ profile }),
      ensureProfile: (user) => set((state) => {
        if (!user) return state;
        if (!state.profile || state.profile.email !== user.email) {
          const profile=blankProfile(user); syncProfile(profile); return { profile };
        }
        return state;
      }),
      updateProfile: (updates) => set((state) => { const profile=state.profile ? { ...state.profile, ...updates } : null; syncProfile(profile); return { profile }; }),
      addAddress: (address) => set((state) => {
        if (!state.profile) return state;
        const id = address.id || `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const shouldDefault = address.isDefault || state.profile.addresses.length === 0;
        const next = state.profile.addresses.map((item) => ({ ...item, isDefault: shouldDefault ? false : item.isDefault }));
        return {
          profile: { ...state.profile, addresses: [...next, { ...address, id, isDefault: shouldDefault }] },
        };
      }),
      updateAddress: (id, address) => set((state) => {
        if (!state.profile) return state;
        const isDefault = address.isDefault;
        return {
          profile: {
            ...state.profile,
            addresses: state.profile.addresses.map((item) => {
              if (item.id === id) return { ...address, id, isDefault };
              return isDefault ? { ...item, isDefault: false } : item;
            }),
          },
        };
      }),
      deleteAddress: (id) => set((state) => {
        if (!state.profile) return state;
        const remaining = state.profile.addresses.filter((item) => item.id !== id);
        if (remaining.length && !remaining.some((item) => item.isDefault)) remaining[0] = { ...remaining[0], isDefault: true };
        return { profile: { ...state.profile, addresses: remaining } };
      }),
      setDefaultAddress: (id) => set((state) => {
        if (!state.profile) return state;
        return {
          profile: {
            ...state.profile,
            addresses: state.profile.addresses.map((item) => ({ ...item, isDefault: item.id === id })),
          },
        };
      }),
    }),
    { name: 'voicecart-user-profile' }
  )
);

useUserStore.subscribe((state)=>{ syncProfile(state.profile); });
