import type { Catalog, Profile } from '$lib/workspace/model';
import { UUID, validateCatalog, validateProfile } from '$lib/workspace/model';
import type { PublishedMenu } from '$lib/server/public-catalog';

export type StudioOperation = 'READ_MENU' | 'READ_PROFILE' | 'SAVE_MENU' | 'SAVE_PROFILE' | 'PUBLISH';
export interface SavedStudioDraft<T> { venueId: string; version: number; content: T }
export interface StudioGateway { call<T>(operation: StudioOperation, body?: Record<string, unknown>, key?: string): Promise<T> }
export class StudioError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function httpStudioGateway(branchId: string, csrf: () => string): StudioGateway {
  if (!UUID.test(branchId)) throw new Error('A valid branch is required.');
  return { async call<T>(operation: StudioOperation, body = {}, key?: string): Promise<T> {
    const write = !operation.startsWith('READ_');
    const resource = operation.includes('PROFILE') ? 'profile-draft' : operation === 'PUBLISH' ? 'menu-publications' : 'menu-draft';
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`/api/v2/merchant/branches/${encodeURIComponent(branchId)}/${resource}`, {
        method: write ? operation === 'PUBLISH' ? 'POST' : 'PUT' : 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json', ...(write ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf(), 'Idempotency-Key': key || '' } : {}) },
        ...(write ? { body: JSON.stringify(body) } : {})
      });
      let result; try { result = await response.json(); } catch { throw new StudioError(503, 'The result could not be confirmed. Keep this page open and retry the unchanged request.'); }
      if (!response.ok) throw new StudioError(response.status, result.detail || 'The menu request could not finish.');
      return result as T;
    } catch (error) {
      if (error instanceof StudioError) throw error;
      throw new StudioError(0, 'Connection interrupted. The change may have saved. Keep this page open and retry the unchanged request.');
    } finally { clearTimeout(timer); }
  } };
}

export class StudioCommands {
  pending: { operation: StudioOperation; body: Record<string, unknown>; key: string; uncertain: boolean } | null = null;
  working = false;
  publication: PublishedMenu | null = null;
  menu: SavedStudioDraft<Catalog>;
  profile: SavedStudioDraft<Profile>;
  constructor(public branchId: string, private gateway: StudioGateway, menu: SavedStudioDraft<Catalog>, profile: SavedStudioDraft<Profile>) {
    if (!UUID.test(branchId) || menu.venueId !== branchId || profile.venueId !== branchId
      || !Number.isSafeInteger(menu.version) || menu.version < 1 || !Number.isSafeInteger(profile.version) || profile.version < 1
      || validateCatalog(menu.content).length || validateProfile(profile.content).length) throw new Error('The saved drafts do not match this branch.');
    this.menu = structuredClone(menu); this.profile = structuredClone(profile);
  }
  async saveMenu(content: Catalog, key: string) {
    if (validateCatalog(content).length) throw new StudioError(422, 'Correct the menu fields before saving to the business.');
    return this.start('SAVE_MENU', { expectedVersion: this.menu.version, content }, key);
  }
  async saveProfile(content: Profile, key: string) {
    if (validateProfile(content).length) throw new StudioError(422, 'Correct the branch details before saving to the business.');
    return this.start('SAVE_PROFILE', { expectedVersion: this.profile.version, content }, key);
  }
  async publish(key: string) {
    if (!this.menu.content.sections.some(section => section.items.length)) throw new StudioError(422, 'Add an item before publication.');
    return this.start('PUBLISH', { draftVersion: this.menu.version, profileVersion: this.profile.version }, key);
  }
  private async start(operation: StudioOperation, body: Record<string, unknown>, key: string) {
    if (this.pending || this.working) throw new StudioError(409, 'Resolve the current request before starting another change.');
    if (!UUID.test(key)) throw new StudioError(422, 'A valid request key is required.');
    this.pending = { operation, body: structuredClone(body), key, uncertain: false };
    return this.retry();
  }
  async retry(): Promise<unknown> {
    if (!this.pending || this.working) throw new StudioError(409, 'No unchanged request is ready to retry.');
    const command = structuredClone(this.pending); this.working = true;
    try {
      const result = await this.gateway.call<unknown>(command.operation, command.body, command.key);
      const value = result as SavedStudioDraft<Catalog | Profile>;
      if (command.operation === 'PUBLISH') {
        const publication = result as PublishedMenu;
        if (publication.venueId !== this.branchId || !UUID.test(publication.publicationId) || validateCatalog(publication.content).length) throw new StudioError(503, 'The publication response could not be confirmed. Retry the original request.');
        this.publication = structuredClone(publication);
      } else {
        if (value.venueId !== this.branchId || value.version !== Number(command.body.expectedVersion) + 1
          || (command.operation === 'SAVE_MENU' ? validateCatalog(value.content) : validateProfile(value.content)).length) throw new StudioError(503, 'The saved response could not be confirmed. Retry the original request.');
        if (command.operation === 'SAVE_MENU') this.menu = structuredClone(value as SavedStudioDraft<Catalog>);
        else this.profile = structuredClone(value as SavedStudioDraft<Profile>);
      }
      this.pending = null; return result;
    } catch (error) {
      // A first, complete 4xx rejects this attempt. After a timeout/5xx, a later
      // auth/validation error cannot prove that the earlier attempt never
      // committed. Keep its detached body/key until its result is confirmed.
      if (error instanceof StudioError && error.status >= 400 && error.status < 500 && !command.uncertain) this.pending = null;
      else if (this.pending) this.pending.uncertain = true;
      throw error;
    } finally { this.working = false; }
  }
}
