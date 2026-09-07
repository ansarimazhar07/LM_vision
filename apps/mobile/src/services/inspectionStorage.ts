import AsyncStoragePkg from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LocalInspectionDraft } from '../state/draft';
import { LocalInspectionDraftSchema } from '../state/draft';
import { syncManager } from './syncManager';

interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const AsyncStorage: StorageBackend = (
  (AsyncStoragePkg as unknown as { default?: StorageBackend }).default ||
  (AsyncStoragePkg as unknown as StorageBackend)
);

const STORAGE_KEY = '@lm_vision:inspections_v1';

export interface SaveResult {
  success: boolean;
  savedRemotely: boolean;
  localId: string;
  error?: string;
}

/**
 * Dual-mode inspection persistence service
 * 
 * Target inspection lifecycle:
 * Create inspection -> Save -> Close/reopen app -> History -> Inspection detail
 * 
 * REAL MODE: Mobile -> Supabase -> PostgreSQL (when credentials + auth session exist)
 * DEMO MODE: Mobile -> Persistent local storage via AsyncStorage (when credentials missing or offline)
 */
export class InspectionStorageService {
  /**
   * Load all saved inspections from persistent storage.
   * Merges local storage and remote records when available.
   */
  async loadInspections(supabase?: SupabaseClient | null): Promise<LocalInspectionDraft[]> {
    const localInspections = await this.loadFromLocalStorage();

    if (!supabase) {
      return localInspections;
    }

    try {
      // Attempt remote fetch if Supabase client is available
      const { data: userSession } = await supabase.auth.getSession();
      if (!userSession?.session?.user) {
        return localInspections;
      }

      const { data: remoteRows, error } = await supabase
        .from('inspections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !remoteRows) {
        return localInspections;
      }

      // Local drafts remain the source of truth for the field UI. Remote rows
      // are used only to refresh remote timestamps; never duplicate records or
      // replace an unsynchronized local version during history loading.
      const remoteById = new Map(remoteRows.map((row) => [String(row.id), row]));
      const refreshed = localInspections.map((local) => {
        const remote = local.serverId ? remoteById.get(local.serverId) : undefined;
        if (!remote) return local;
        return {
          ...local,
          remoteUpdatedAt: typeof remote.updated_at === 'string' ? remote.updated_at : local.remoteUpdatedAt,
        };
      });
      await this.saveToLocalStorage(refreshed);
      return refreshed;
    } catch {
      // Fallback seamlessly to local records
      return localInspections;
    }
  }

  /**
   * Save an inspection draft to persistent storage.
   * Always writes to AsyncStorage so inspections survive app restarts.
   * Attempts remote sync if Supabase is connected.
   */
  async saveInspection(
    draft: LocalInspectionDraft,
    supabase?: SupabaseClient | null
  ): Promise<SaveResult> {
    try {
      // 1. Always persist to durable local storage
      const existing = await this.loadFromLocalStorage();
      const index = existing.findIndex((item) => item.localId === draft.localId);
      
      const updatedDraft: LocalInspectionDraft = {
        ...draft,
        version: Math.max(1, draft.version + 1),
        updatedAt: new Date().toISOString(),
        syncError: undefined,
      };

      let updatedList: LocalInspectionDraft[];
      if (index >= 0) {
        updatedList = [...existing];
        updatedList[index] = updatedDraft;
      } else {
        updatedList = [updatedDraft, ...existing];
      }

      await this.saveToLocalStorage(updatedList);

      // 2. Queue a durable, dependency-ordered sync plan when a real
      // Supabase client is available. Direct remote writes are deliberately
      // avoided so retries cannot silently skip dependent entities.
      const syncCapable = Boolean(
        supabase &&
        typeof (supabase as unknown as { from?: unknown }).from === 'function' &&
        typeof (supabase as unknown as { storage?: unknown }).storage === 'object'
      );
      let remoteError: string | undefined;
      if (syncCapable) {
        try {
          const queued = await syncManager.enqueueDraft(updatedDraft);
          updatedDraft.pendingOperations = queued.map((operation) => operation.operationId);
          updatedDraft.syncStatus = 'PENDING_SYNC';
          await this.saveToLocalStorage(
            updatedList.map((item) => (item.localId === draft.localId ? updatedDraft : item))
          );
        } catch (error) {
          remoteError = error instanceof Error ? error.message : 'Unable to queue synchronization.';
          updatedDraft.syncStatus = 'SYNC_FAILED';
          updatedDraft.syncError = remoteError;
          await this.saveToLocalStorage(
            updatedList.map((item) => (item.localId === draft.localId ? updatedDraft : item))
          );
        }
      }

      return {
        success: true,
        savedRemotely: false,
        localId: draft.localId,
        error: remoteError,
      };
    } catch (err) {
      return {
        success: false,
        savedRemotely: false,
        localId: draft.localId,
        error: err instanceof Error ? err.message : 'Local storage save failed',
      };
    }
  }

  /**
   * Get an inspection by its local or server ID.
   */
  async getInspectionById(id: string): Promise<LocalInspectionDraft | null> {
    const all = await this.loadFromLocalStorage();
    return all.find((item) => item.localId === id || item.serverId === id) ?? null;
  }

  /** Persists sync metadata without rewriting inspection business state. */
  async updateSyncMetadata(localId: string, patch: Partial<LocalInspectionDraft>): Promise<void> {
    const existing = await this.loadFromLocalStorage();
    const index = existing.findIndex((item) => item.localId === localId || item.serverId === localId);
    if (index < 0) return;
    const next = { ...existing[index], ...patch, updatedAt: existing[index]?.updatedAt || new Date().toISOString() };
    const parsed = LocalInspectionDraftSchema.safeParse(next);
    if (!parsed.success) return;
    existing[index] = parsed.data;
    await this.saveToLocalStorage(existing);
  }

  /**
   * Delete an inspection from persistent storage.
   */
  async deleteInspection(localId: string): Promise<void> {
    const existing = await this.loadFromLocalStorage();
    const filtered = existing.filter((item) => item.localId !== localId);
    await this.saveToLocalStorage(filtered);
  }

  /**
   * Clear all local inspections (used for testing or demo reset).
   */
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  async loadFromLocalStorage(): Promise<LocalInspectionDraft[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((item) => {
          const result = LocalInspectionDraftSchema.safeParse(item);
          return result.success ? result.data : null;
        })
        .filter((item): item is LocalInspectionDraft => item !== null);
    } catch (error) {
      if (String(error).includes('CursorWindow') || String(error).includes('Row too big')) {
        console.warn('[InspectionStorage] SQLite CursorWindow overflow detected in local storage. Purging oversized storage key.');
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      }
      return [];
    }
  }

  private async saveToLocalStorage(list: LocalInspectionDraft[]): Promise<void> {
    // CRITICAL: Strip large base64 data before saving to AsyncStorage to prevent SQLite CursorWindow 2MB overflow.
    // Captured photos exist safely on device disk via their fileUrl.
    const sanitized = list.map((draft) => ({
      ...draft,
      images: (draft.images || []).map((img) => {
        if (img.base64Data) {
          const { base64Data, ...rest } = img;
          return rest;
        }
        return img;
      }),
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  }
}

export const inspectionStorage = new InspectionStorageService();
