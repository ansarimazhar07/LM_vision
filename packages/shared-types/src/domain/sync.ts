import { z } from 'zod';
import {
  ConflictResolutionStateSchema,
  ConflictTypeSchema,
  SyncEntityTypeSchema,
  SyncErrorCategorySchema,
  SyncOperationStatusSchema,
  SyncOperationTypeSchema,
} from '../enums/index.js';

/** A durable, retryable local mutation. Payloads must never contain credentials. */
export const SyncOperationSchema = z.object({
  operationId: z.string().min(1),
  inspectionId: z.string().min(1),
  entityType: SyncEntityTypeSchema,
  entityId: z.string().min(1),
  operationType: SyncOperationTypeSchema,
  payload: z.record(z.unknown()).optional(),
  payloadRef: z.string().optional(),
  createdAt: z.string().datetime(),
  attemptCount: z.number().int().nonnegative().default(0),
  lastAttemptAt: z.string().datetime().optional(),
  status: SyncOperationStatusSchema.default('QUEUED'),
  idempotencyKey: z.string().min(1),
  errorCategory: SyncErrorCategorySchema.optional(),
  retryable: z.boolean().default(true),
  lastError: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
});
export type SyncOperation = z.infer<typeof SyncOperationSchema>;

export const SyncConflictSchema = z.object({
  conflictId: z.string().min(1),
  inspectionId: z.string().min(1),
  conflictType: ConflictTypeSchema,
  localVersion: z.number().int().positive().optional(),
  remoteVersion: z.number().int().positive().optional(),
  localUpdatedAt: z.string().datetime().optional(),
  remoteUpdatedAt: z.string().datetime().optional(),
  localSnapshot: z.record(z.unknown()).optional(),
  remoteSnapshot: z.record(z.unknown()).optional(),
  actorId: z.string().optional(),
  message: z.string().min(1),
  detectedAt: z.string().datetime(),
  resolutionState: ConflictResolutionStateSchema.default('OPEN'),
});
export type SyncConflict = z.infer<typeof SyncConflictSchema>;
