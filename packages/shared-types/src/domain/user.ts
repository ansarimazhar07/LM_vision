import { z } from 'zod';
import { UserRoleSchema } from '../enums/index.js';
import { UuidSchema, IsoTimestampSchema } from './common.js';

/**
 * Inspector specific credentials & jurisdiction
 */
export const InspectorProfileSchema = z.object({
  badgeNumber: z.string().min(1),
  designation: z.string().min(1),
  jurisdictionZone: z.string().min(1),
  jurisdictionState: z.string().min(1),
  officeAddress: z.string().optional(),
});
export type InspectorProfile = z.infer<typeof InspectorProfileSchema>;

/**
 * Canonical User Entity
 */
export const UserSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  fullName: z.string().min(1),
  role: UserRoleSchema,
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  inspectorProfile: InspectorProfileSchema.optional(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
  lastLoginAt: IsoTimestampSchema.optional(),
});
export type User = z.infer<typeof UserSchema>;
