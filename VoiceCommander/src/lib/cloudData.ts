import type { Order, PurchaseHistory, UserProfile } from '../types';
import { firebaseConfigured, getFirebase } from './firebase';

const activeKey = 'voicecart-active-uid';
export const setActiveCloudUser = (uid?: string) => { if (uid) localStorage.setItem(activeKey, uid); else localStorage.removeItem(activeKey); };
export const getActiveCloudUser = () => localStorage.getItem(activeKey);

async function patch(data: Record<string, unknown>) {
  const uid = getActiveCloudUser();
  if (!uid || !firebaseConfigured) return;
  try { const firebase = await getFirebase(); await firebase.firestore().collection('users').doc(uid).set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); } catch (error) { console.warn('Cloud sync failed:', error); }
}
export const syncProfile = (profile: UserProfile | null) => patch({ profile });
export const syncOrders = (orders: Order[]) => patch({ orders });
export const syncShoppingData = (history: PurchaseHistory[], searches: string[]) => patch({ history, searches });

export async function loadCloudData(uid: string) {
  if (!firebaseConfigured) return null;
  try { const firebase = await getFirebase(); const snap = await firebase.firestore().collection('users').doc(uid).get(); return snap.exists ? snap.data() : null; } catch (error) { console.warn('Cloud load failed:', error); return null; }
}
