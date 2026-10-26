import { editablePreparation } from './preparation';
import type { WorkspacePreparation } from '$lib/workspace/model';

export const MENU_DRAFT_DATABASE = 'menumini-menu-studio-v1';
interface StoredPreparation { id: 'current'; revision: number; savedAt: string; draft: WorkspacePreparation }
export interface DevicePreparation { revision: number; savedAt: string | null; draft: WorkspacePreparation | null }
export class DeviceDraftConflict extends Error {
  constructor() { super('Another tab saved a newer preparation. Download your current edits before reloading the saved draft.'); }
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MENU_DRAFT_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('preparations', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => reject(new Error('Device storage is unavailable. Download your preparation to keep it.'));
  });
}
function checked(value: unknown): StoredPreparation | null {
  if (value === undefined) return null;
  const v = value as StoredPreparation;
  if (!v || Object.keys(v).sort().join() !== 'draft,id,revision,savedAt' || v.id !== 'current' || !Number.isSafeInteger(v.revision)
    || v.revision < 1 || !Number.isFinite(Date.parse(v.savedAt)) || !editablePreparation(v.draft)) throw new Error('The saved preparation cannot be read safely. It has not been replaced.');
  return v;
}
export async function readDevicePreparation(): Promise<DevicePreparation> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('preparations', 'readonly'); let value: StoredPreparation | null = null;
    const request = transaction.objectStore('preparations').get('current');
    request.onsuccess = () => { try { value = checked(request.result); } catch (error) { transaction.abort(); reject(error); } };
    transaction.oncomplete = () => { db.close(); resolve(value ? { revision: value.revision, savedAt: value.savedAt, draft: structuredClone(value.draft) } : { revision: 0, savedAt: null, draft: null }); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error('Device storage could not be read. Your current edits remain on this page.')); };
  });
}
export async function saveDevicePreparation(draft: WorkspacePreparation, expectedRevision: number): Promise<DevicePreparation> {
  if (!editablePreparation(draft) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('This preparation cannot be saved. Download or correct the supported fields first.');
  const snapshot = structuredClone(draft), db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('preparations', 'readwrite'); let result: StoredPreparation; let failure: Error | null = null;
    const store = transaction.objectStore('preparations'), request = store.get('current');
    request.onsuccess = () => {
      try {
        const current = checked(request.result);
        if ((current?.revision || 0) !== expectedRevision) throw new DeviceDraftConflict();
        result = { id: 'current', revision: expectedRevision + 1, savedAt: new Date().toISOString(), draft: snapshot };
        store.put(result);
      } catch (error) { failure = error as Error; transaction.abort(); }
    };
    transaction.oncomplete = () => { db.close(); resolve({ revision: result.revision, savedAt: result.savedAt, draft: structuredClone(result.draft) }); };
    transaction.onabort = transaction.onerror = () => { db.close(); reject(failure || new Error('Saving on this device failed. Download your preparation to keep it.')); };
  });
}
