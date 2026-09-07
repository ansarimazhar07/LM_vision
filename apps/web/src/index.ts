import type {
  Inspection,
  InspectionFilterQuery,
  ApiSuccessResponse,
  PaginationMeta,
} from '@lm-vision/shared-types';
import { validateOrThrow, InspectionFilterQuerySchema } from '@lm-vision/validation';

export interface WebDashboardState {
  inspections: Inspection[];
  activeFilter: InspectionFilterQuery;
  pagination: PaginationMeta;
}

/**
 * Validates search query parameters for the web inspection dashboard
 */
export function parseDashboardQuery(rawQuery: unknown): InspectionFilterQuery {
  return validateOrThrow(InspectionFilterQuerySchema, rawQuery, 'Invalid dashboard filter parameters');
}

/**
 * Builds a standardized API success envelope for the web dashboard
 */
export function createWebApiResponse<T>(data: T, requestId: string, pagination?: PaginationMeta): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      pagination,
    },
  };
}
