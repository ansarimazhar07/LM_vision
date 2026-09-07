import AsyncStoragePkg from '@react-native-async-storage/async-storage';
import {
  SyncOperationSchema,
  type SyncOperation,
  type SyncOperationStatus,
  type SyncOperationType,
  type SyncEntityType,
} from '@lm-vision/shared-types';

interface StorageBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const AsyncStorage: StorageBackend = (
  (AsyncStoragePkg as unknown as { default?: StorageBackend }).default ||
  (AsyncStoragePkg as unknown as StorageBackend)
);

export const SYNC_QUEUE_STORAGE_KEY = '@lm_vision:sync_queue_v1';
const CORRUPT_QUEUE_STORAGE_KEY = '@lm_vision:sync_queue_corrupt_v1';

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

function fallbackHash(value: string): string {
  // Four independent 32-bit lanes provide a stable 64-character key when
  // WebCrypto is unavailable in an older React Native runtime.
  const lanes: [number, number, number, number] = [2166136261, 2654435761, 1597334677, 3812015801];
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    lanes[0] = Math.imul(lanes[0] ^ code, 16777619) >>> 0;
    lanes[1] = Math.imul(lanes[1] ^ (code + index), 2246822519) >>> 0;
    lanes[2] = Math.imul(lanes[2] ^ (code * 31), 3266489917) >>> 0;
    lanes[3] = Math.imul(lanes[3] ^ (code * 131), 668265263) >>> 0;
  }
  return lanes.map((lane) => lane.toString(16).padStart(8, '0')).join('');
}

export async function createIdempotencyKey(input: {
  inspectionId: string;
  entityId: string;
  operationType: SyncOperationType;
  entityVersion: number;
}): Promise<string> {
  const canonical = stableSerialize(input);
  const subtle = (globalThis as { crypto?: { subtle?: { digest: (algorithm: string, data: ArrayBuffer) => Promise<ArrayBuffer> } } }).crypto?.subtle;
  if (subtle && typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(canonical);
    const digest = await subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return fallbackHash(canonical);
}

function stripSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !/(access.?token|refresh.?token|api.?key|secret|password|authorization|base64Data)/i.test(key))
    .map(([key, nested]) => [key, stripSecrets(nested)]));
}

export interface QueueOperationInput {
  inspectionId: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  entityVersion: number;
  payload?: Record<string, unknown>;
  payloadRef?: string;
  dependsOn?: string[];
  retryable?: boolean;
}

export class DurableSyncQueue {
  private readonly storage: StorageBackend;

  constructor(storage: StorageBackend = AsyncStorage) {
    this.storage = storage;
  }

  async list(): Promise<SyncOperation[]> {
    let raw: string | null = null;
    try {
      raw = await this.storage.getItem(SYNC_QUEUE_STORAGE_KEY);
    } catch (error) {
      if (String(error).includes('CursorWindow') || String(error).includes('Row too big')) {
        console.warn('[SyncQueue] SQLite CursorWindow overflow detected. Purging oversized queue.');
        await this.storage.removeItem(SYNC_QUEUE_STORAGE_KEY).catch(() => {});
        return [];
      }
      throw error;
    }
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await this.preserveCorruptQueue(raw, 'Queue JSON could not be parsed.');
      return [];
    }
    if (!Array.isArray(parsed)) {
      await this.preserveCorruptQueue(raw, 'Queue root is not an array.');
      return [];
    }

    const valid: SyncOperation[] = [];
    const invalid: unknown[] = [];
    parsed.forEach((item) => {
      const result = SyncOperationSchema.safeParse(item);
      if (result.success) valid.push(result.data);
      else invalid.push(item);
    });
    if (invalid.length > 0) {
      await this.preserveCorruptQueue(JSON.stringify(invalid), 'One or more queue operations failed validation.');
      await this.save(valid);
    }
    return valid;
  }

  async enqueue(input: QueueOperationInput, now = new Date()): Promise<SyncOperation> {
    const idempotencyKey = await createIdempotencyKey(input);
    const current = await this.list();
    const existing = current.find((operation) => operation.idempotencyKey === idempotencyKey);
    if (existing) return existing;

    const operation = SyncOperationSchema.parse({
      operationId: `sync-${idempotencyKey.slice(0, 32)}`,
      inspectionId: input.inspectionId,
      entityType: input.entityType,
      entityId: input.entityId,
      operationType: input.operationType,
      payload: input.payload ? stripSecrets(input.payload) : undefined,
      payloadRef: input.payloadRef,
      createdAt: now.toISOString(),
      attemptCount: 0,
      status: 'QUEUED',
      idempotencyKey,
      retryable: input.retryable ?? true,
      dependsOn: input.dependsOn ?? [],
    });
    await this.save([...current, operation]);
    return operation;
  }

  async update(operationId: string, patch: Partial<SyncOperation>): Promise<SyncOperation | null> {
    const current = await this.list();
    const index = current.findIndex((operation) => operation.operationId === operationId);
    if (index < 0) return null;
    const next = SyncOperationSchema.parse({ ...current[index], ...patch });
    current[index] = next;
    await this.save(current);
    return next;
  }

  async updateStatus(operationId: string, status: SyncOperationStatus, patch: Partial<SyncOperation> = {}): Promise<SyncOperation | null> {
    return this.update(operationId, { ...patch, status });
  }

  async pending(): Promise<SyncOperation[]> {
    return (await this.list())
      .filter((operation) => operation.status !== 'COMPLETED')
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async clearCompleted(): Promise<void> {
    const current = await this.list();
    await this.save(current.filter((operation) => operation.status !== 'COMPLETED'));
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(SYNC_QUEUE_STORAGE_KEY);
  }

  private async save(operations: SyncOperation[]): Promise<void> {
    await this.storage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(operations));
  }

  private async preserveCorruptQueue(raw: string, reason: string): Promise<void> {
    try {
      if (raw.length > 64 * 1024) {
        // Prevent CursorWindow overflow by discarding oversized corrupt payloads
        return;
      }
      const previous = await this.storage.getItem(CORRUPT_QUEUE_STORAGE_KEY);
      let entries: unknown[] = [];
      if (previous) {
        try {
          const parsed = JSON.parse(previous);
          if (Array.isArray(parsed)) entries = parsed;
        } catch {
          entries = [];
        }
      }
      entries.push({ detectedAt: new Date().toISOString(), reason, raw: raw.slice(0, 1000) });
      await this.storage.setItem(CORRUPT_QUEUE_STORAGE_KEY, JSON.stringify(entries.slice(-5)));
    } catch {
      // Ignore errors when saving corrupt queue diagnostic info
    }
  }
}

export const durableSyncQueue = new DurableSyncQueue();

export function getRetryDelayMs(attemptCount: number): number {
  const boundedAttempt = Math.min(Math.max(attemptCount, 0), 10);
  return Math.min(5 * 60 * 1000, 1000 * (2 ** boundedAttempt));
}
