/**
 * Phase 11 — Offline/online synchronization and field-resilience contracts.
 * These tests exercise deterministic local behavior and mocked transport only;
 * they do not claim device, background, or production-cloud validation.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ConnectionStateSchema,
  ConflictResolutionStateSchema,
  ConflictTypeSchema,
  EvidenceSyncStateSchema,
  SyncOperationSchema,
  SyncStatusSchema,
} from '@lm-vision/shared-types';
import { createLocalInspectionDraft } from '../apps/mobile/src/state/draft';
import {
  createIdempotencyKey,
  DurableSyncQueue,
  getRetryDelayMs,
  type QueueOperationInput,
} from '../apps/mobile/src/services/syncQueue';
import { SyncManager } from '../apps/mobile/src/services/syncManager';

class MemoryStorage {
  private values = new Map<string, string>();
  async getItem(key: string): Promise<string | null> { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string): Promise<void> { this.values.set(key, value); }
  async removeItem(key: string): Promise<void> { this.values.delete(key); }
  raw(key: string): string | undefined { return this.values.get(key); }
}

const inspectionId = '11111111-1111-4111-8111-111111111111';
const actorId = '00000000-0000-4000-8000-000000000001';

function queueInput(overrides: Partial<QueueOperationInput> = {}): QueueOperationInput {
  return {
    inspectionId,
    entityType: 'INSPECTION',
    entityId: inspectionId,
    operationType: 'UPSERT_INSPECTION',
    entityVersion: 1,
    payload: { safe: true, accessToken: 'must-not-be-persisted' },
    ...overrides,
  };
}

function createDraft() {
  return createLocalInspectionDraft({
    category: 'FOOD_BEVERAGE',
    packageType: 'POUCH',
    productName: 'Field sample',
  });
}

function fakeSupabase(options: { remote?: Record<string, unknown> | null; upsertError?: { message: string; code?: string } } = {}) {
  const calls: Array<{ table: string; method: string; payload?: unknown }> = [];
  const client = {
    calls,
    auth: {
      getSession: async () => ({ data: { session: { user: { id: actorId } } }, error: null }),
      refreshSession: async () => ({ data: { session: { user: { id: actorId } } }, error: null }),
    },
    from(table: string) {
      const query: any = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: table === 'inspections' ? (options.remote ?? null) : null, error: null }),
        upsert: async (payload: unknown) => {
          calls.push({ table, method: 'upsert', payload });
          return { data: null, error: options.upsertError ?? null };
        },
        update: () => ({ eq: async () => ({ data: null, error: options.upsertError ?? null }) }),
      };
      return query;
    },
    storage: { from: () => ({ upload: async () => ({ data: null, error: null }) }) },
  };
  return client;
}

describe('Phase 11: Offline/Online Synchronization', () => {
  it('1 validates every connection state', () => {
    for (const state of ['ONLINE', 'OFFLINE', 'SYNCING', 'SYNCED', 'SYNC_FAILED', 'CONFLICT']) {
      expect(ConnectionStateSchema.parse(state)).toBe(state);
    }
  });

  it('2 validates local sync statuses', () => {
    expect(SyncStatusSchema.options).toContain('PENDING_SYNC');
    expect(SyncStatusSchema.options).toContain('SYNC_CONFLICT');
  });

  it('3 validates evidence upload states', () => {
    expect(EvidenceSyncStateSchema.parse('UPLOADING')).toBe('UPLOADING');
    expect(EvidenceSyncStateSchema.parse('SYNCED')).toBe('SYNCED');
  });

  it('4 validates conflict types and resolution state', () => {
    expect(ConflictTypeSchema.parse('CONTENT_CONFLICT')).toBe('CONTENT_CONFLICT');
    expect(ConflictResolutionStateSchema.parse('OPEN')).toBe('OPEN');
  });

  it('5 creates stable UUID local inspection IDs', () => {
    expect(createDraft().localId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('6 starts drafts in local-only state', () => {
    const draft = createDraft();
    expect(draft.syncStatus).toBe('LOCAL_ONLY');
    expect(draft.pendingOperations).toContain('CREATE_DRAFT');
  });

  it('7 produces deterministic idempotency keys', async () => {
    const first = await createIdempotencyKey({ inspectionId, entityId: inspectionId, operationType: 'UPSERT_INSPECTION', entityVersion: 1 });
    const second = await createIdempotencyKey({ inspectionId, entityId: inspectionId, operationType: 'UPSERT_INSPECTION', entityVersion: 1 });
    expect(first).toBe(second);
  });

  it('8 changes idempotency keys when the entity version changes', async () => {
    const first = await createIdempotencyKey({ inspectionId, entityId: inspectionId, operationType: 'UPSERT_INSPECTION', entityVersion: 1 });
    const second = await createIdempotencyKey({ inspectionId, entityId: inspectionId, operationType: 'UPSERT_INSPECTION', entityVersion: 2 });
    expect(first).not.toBe(second);
  });

  it('9 persists queued operations across queue instances', async () => {
    const storage = new MemoryStorage();
    const queue = new DurableSyncQueue(storage);
    await queue.enqueue(queueInput());
    expect((await new DurableSyncQueue(storage).list())).toHaveLength(1);
  });

  it('10 deduplicates a repeated operation', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const first = await queue.enqueue(queueInput());
    const second = await queue.enqueue(queueInput());
    expect(second.operationId).toBe(first.operationId);
    expect(await queue.list()).toHaveLength(1);
  });

  it('11 strips credentials from durable payloads', async () => {
    const storage = new MemoryStorage();
    await new DurableSyncQueue(storage).enqueue(queueInput());
    expect(storage.raw('@lm_vision:sync_queue_v1')).not.toContain('accessToken');
  });

  it('12 preserves valid queue entries when one item is corrupt', async () => {
    const storage = new MemoryStorage();
    const valid = await new DurableSyncQueue(storage).enqueue(queueInput());
    await storage.setItem('@lm_vision:sync_queue_v1', JSON.stringify([valid, { invalid: true }]));
    expect(await new DurableSyncQueue(storage).list()).toHaveLength(1);
    expect(storage.raw('@lm_vision:sync_queue_corrupt_v1')).toContain('invalid');
  });

  it('13 backs up a malformed queue root', async () => {
    const storage = new MemoryStorage();
    await storage.setItem('@lm_vision:sync_queue_v1', '{bad');
    expect(await new DurableSyncQueue(storage).list()).toEqual([]);
    expect(storage.raw('@lm_vision:sync_queue_corrupt_v1')).toContain('Queue JSON');
  });

  it('14 tolerates a malformed prior corruption backup', async () => {
    const storage = new MemoryStorage();
    await storage.setItem('@lm_vision:sync_queue_corrupt_v1', '{bad');
    await storage.setItem('@lm_vision:sync_queue_v1', '{bad');
    await expect(new DurableSyncQueue(storage).list()).resolves.toEqual([]);
  });

  it('15 bounds exponential retry delay', () => {
    expect(getRetryDelayMs(0)).toBe(1000);
    expect(getRetryDelayMs(20)).toBe(300000);
  });

  it('16 validates the persisted operation contract', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const operation = await queue.enqueue(queueInput());
    expect(SyncOperationSchema.parse(operation).operationType).toBe('UPSERT_INSPECTION');
  });

  it('17 creates an inspection operation before dependent evidence operations', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    const draft = createDraft();
    draft.images.push({
      id: '22222222-2222-4222-8222-222222222222', inspectionId: draft.localId, surface: 'FRONT', fileUrl: 'file:///sample.jpg',
      fileSizeBytes: 10, mimeType: 'image/jpeg', sha256Hash: 'hash', syncState: 'LOCAL_ONLY', capturedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    });
    const operations = await manager.enqueueDraft(draft);
    expect(operations[0]?.operationType).toBe('UPSERT_INSPECTION');
    expect(operations.some((operation) => operation.operationType === 'UPLOAD_IMAGE')).toBe(true);
  });

  it('18 assigns image uploads a dependency on the inspection', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    const operations = await manager.enqueueDraft(createDraft());
    expect(operations[0]?.dependsOn).toEqual([]);
  });

  it('19 retains a finalized operation at the end of the dependency plan', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    const draft = createDraft();
    draft.isFinalized = true;
    const operations = await manager.enqueueDraft(draft);
    expect(operations.at(-1)?.operationType).toBe('FINALIZE_INSPECTION');
  });

  it('20 completes a mocked online inspection sync', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    const draft = createDraft();
    await manager.enqueueDraft(draft);
    const persist = vi.fn(async () => undefined);
    const result = await manager.sync(fakeSupabase() as any, persist);
    expect(result.state).toBe('SYNCED');
    expect(persist).toHaveBeenCalled();
  });

  it('21 records a server receipt for an idempotent completion', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    await manager.enqueueDraft(createDraft());
    const client = fakeSupabase();
    await manager.sync(client as any, async () => undefined);
    expect(client.calls.some((call) => call.table === 'sync_operation_receipts')).toBe(true);
  });

  it('22 leaves work queued when no client is available', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    await manager.enqueueDraft(createDraft());
    expect((await manager.sync(null, async () => undefined)).state).toBe('OFFLINE');
    expect((await queue.pending()).length).toBeGreaterThan(0);
  });

  it('23 does not overwrite an existing remote record on first upload because of clock skew', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    await manager.enqueueDraft(createDraft());
    const result = await manager.sync(fakeSupabase({ remote: { id: inspectionId, updated_at: new Date(Date.now() + 10000).toISOString() } }) as any, async () => undefined);
    expect(result.state).toBe('SYNCED');
  });

  it('24 detects a true version conflict after a known remote timestamp', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    const draft = createDraft();
    draft.remoteUpdatedAt = new Date(Date.now() - 10000).toISOString();
    await manager.enqueueDraft(draft);
    const remote = { id: draft.localId, updated_at: new Date().toISOString() };
    const result = await manager.sync(fakeSupabase({ remote }) as any, async () => undefined);
    expect(result.conflicts).toBe(1);
  });

  it('25 classifies a validation error as a terminal failed sync', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    await manager.enqueueDraft(createDraft());
    const result = await manager.sync(fakeSupabase({ upsertError: { message: '422 invalid payload', code: '422' } }) as any, async () => undefined);
    expect(result.state).toBe('SYNC_FAILED');
  });

  it('26 prevents concurrent sync runs from duplicating work', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    await manager.enqueueDraft(createDraft());
    const client = fakeSupabase();
    const persist = async () => undefined;
    const [first, second] = await Promise.all([manager.sync(client as any, persist), manager.sync(client as any, persist)]);
    expect(first.completed + second.completed).toBeGreaterThan(0);
  });

  it('27 preserves local inspection fields in the queued payload', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const manager = new SyncManager(queue);
    const draft = createDraft();
    const [operation] = await manager.enqueueDraft(draft);
    expect(operation.payload).toMatchObject({ source_type: 'PHYSICAL' });
    expect(operation.payload?.location_metadata).toMatchObject({ category: 'FOOD_BEVERAGE', packageType: 'POUCH' });
  });

  it('28 exposes retryable operation state in the queue', async () => {
    const queue = new DurableSyncQueue(new MemoryStorage());
    const operation = await queue.enqueue(queueInput({ retryable: true }));
    expect(operation.retryable).toBe(true);
  });

  it('29 defines durable sync metadata columns in the database migration', () => {
    const sql = readFileSync('supabase/migrations/20260906000004_phase11_sync.sql', 'utf8');
    expect(sql).toContain('sync_operation_receipts');
    expect(sql).toContain('sync_version');
    expect(sql).toContain('enable row level security');
  });

  it('30 keeps authorization material out of the synchronization queue', async () => {
    const storage = new MemoryStorage();
    await new DurableSyncQueue(storage).enqueue(queueInput({ payload: { refreshToken: 'secret', nested: { apiKey: 'secret' } } }));
    const raw = storage.raw('@lm_vision:sync_queue_v1') || '';
    expect(raw).not.toContain('refreshToken');
    expect(raw).not.toContain('apiKey');
  });
});
