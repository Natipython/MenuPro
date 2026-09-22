// import Dexie, { type Table } from 'dexie';

/**
 * Dexie wrapper for IndexedDB caching of Menus, Cart, and offline state.
 * Real implementation will uncomment Dexie imports once installed.
 */

/*
export class MenuPlatformDB extends Dexie {
  menus!: Table<any, string>;
  cart!: Table<any, string>;
  offlineActions!: Table<any, number>;

  constructor() {
    super('MenuPlatformDB');
    this.version(1).stores({
      menus: 'id, branchId, updatedAt',
      cart: 'id, itemId',
      offlineActions: '++id, type, timestamp'
    });
  }
}

export const db = new MenuPlatformDB();
*/

// Mock for now until dexie is installed
export const db = {
  menus: { get: async () => null, put: async () => null },
  cart: { toArray: async () => [], add: async () => null, delete: async () => null },
  offlineActions: {}
};
