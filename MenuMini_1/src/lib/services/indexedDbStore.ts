import { writable } from 'svelte/store';

export interface PersistentCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  options?: string;
  specialInstructions?: string;
}

export interface DiningSession {
  businessSlug: string;
  branchSlug: string;
  tableNumber: string;
  cart: PersistentCartItem[];
  customerNote: string;
  lastUpdated: number;
}

const DB_NAME = 'MenuMini_OfflineDB';
const STORE_NAME = 'dining_sessions';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject('IndexedDB not supported');
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'sessionKey' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const indexedDbService = {
  async saveSession(sessionKey: string, data: DiningSession): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ sessionKey, ...data, lastUpdated: Date.now() });
    } catch (e) {
      console.warn('IndexedDB save failed, falling back to localStorage:', e);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`menumini_${sessionKey}`, JSON.stringify(data));
      }
    }
  },

  async loadSession(sessionKey: string): Promise<DiningSession | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(sessionKey);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`menumini_${sessionKey}`);
        if (saved) return JSON.parse(saved);
      }
      return null;
    }
  },

  async clearSession(sessionKey: string): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(sessionKey);
    } catch (e) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`menumini_${sessionKey}`);
      }
    }
  }
};
