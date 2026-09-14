/**
 * Surface Taxonomy and Advisory Container Prior Mapping
 *
 * Provides physical packaging surface classifications and advisory priors
 * for multi-surface Legal Metrology declaration inspections.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Physical metadata only: Surface classification is observational metadata, NOT OCR truth.
 * 2. Priors are strictly advisory: Never infer that a declaration MUST be printed on a specific surface.
 * 3. Default is UNKNOWN: Do not invent surfaces without capture metadata or explicit inspector input.
 */

import type { DeclarationType, PackageSurface, PackagingType } from '@lm-vision/shared-types';

export type PackagingContainerType =
  | 'BOTTLE'
  | 'SACHET'
  | 'POUCH'
  | 'JAR'
  | 'CAN'
  | 'CARTON'
  | 'BOX'
  | 'WRAPPER'
  | 'TUBE'
  | 'BLISTER_PACK'
  | 'UNKNOWN';

/**
 * Maps raw string or legacy surface names into standard PackageSurface.
 */
export function toPackageSurface(surface?: unknown): PackageSurface {
  if (typeof surface !== 'string') return 'UNKNOWN';
  const clean = surface.trim().toUpperCase().replace(/[\s-]+/g, '_');

  switch (clean) {
    case 'FRONT':
    case 'FRONT_PANEL':
    case 'MAIN':
    case 'PDP':
      return 'FRONT';
    case 'BACK':
    case 'BACK_PANEL':
    case 'REAR':
      return 'BACK';
    case 'TOP':
    case 'TOP_SURFACE':
      return 'TOP';
    case 'BOTTOM':
    case 'BASE':
    case 'UNDERSIDE':
      return 'BOTTOM';
    case 'LEFT':
    case 'LEFT_SIDE':
      return 'LEFT';
    case 'RIGHT':
    case 'RIGHT_SIDE':
      return 'RIGHT';
    case 'NECK':
    case 'BOTTLE_NECK':
      return 'NECK';
    case 'SHOULDER':
    case 'BOTTLE_SHOULDER':
      return 'SHOULDER';
    case 'CAP':
    case 'BOTTLE_CAP':
    case 'CROWN':
      return 'CAP';
    case 'LID':
    case 'JAR_LID':
      return 'LID';
    case 'TOP_SEAL':
    case 'TOP_CRIMP':
      return 'TOP_SEAL';
    case 'BOTTOM_SEAL':
    case 'BOTTOM_CRIMP':
      return 'BOTTOM_SEAL';
    case 'CRIMP':
    case 'SEAL':
    case 'SIDE_CRIMP':
      return 'CRIMP';
    case 'EDGE':
    case 'FOIL_EDGE':
      return 'EDGE';
    case 'FLAP':
    case 'CARTON_FLAP':
      return 'FLAP';
    case 'STAMPED_AREA':
    case 'EMBOSSED_AREA':
      return 'STAMPED_AREA';
    case 'LASER_MARK':
    case 'LASER':
      return 'LASER_MARK';
    case 'STICKER':
    case 'OVERPRINT':
      return 'STICKER';
    case 'NUTRITION_PANEL':
      return 'NUTRITION_PANEL';
    case 'BARCODE_PANEL':
      return 'BARCODE_PANEL';
    case 'OTHER':
      return 'OTHER';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Maps PackagingType to PackagingContainerType.
 */
export function normalizeContainerType(packagingType?: PackagingType | string): PackagingContainerType {
  if (!packagingType) return 'UNKNOWN';
  const clean = String(packagingType).trim().toUpperCase();

  switch (clean) {
    case 'BOTTLE':
      return 'BOTTLE';
    case 'SACHET':
      return 'SACHET';
    case 'POUCH':
      return 'POUCH';
    case 'JAR':
      return 'JAR';
    case 'CAN':
    case 'TIN':
      return 'CAN';
    case 'BOX':
      return 'BOX';
    case 'CARTON':
      return 'CARTON';
    case 'WRAPPER':
      return 'WRAPPER';
    case 'TUBE':
      return 'TUBE';
    case 'BLISTER_PACK':
      return 'BLISTER_PACK';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Advisory surface priors for target declaration fields by container type.
 * 
 * GUARDRAIL: These are guidance priors to determine whether additional
 * search is warranted. They are NEVER statutory legal requirements.
 */
export function getAdvisoryRelevantSurfaces(
  fieldType: DeclarationType,
  containerType: PackagingContainerType
): readonly PackageSurface[] {
  switch (containerType) {
    case 'BOTTLE':
      if (fieldType === 'MRP') {
        return ['FRONT', 'BACK', 'NECK', 'SHOULDER', 'CAP'];
      }
      if (fieldType === 'DATE_OF_MANUFACTURE' || fieldType === 'DATE_OF_PACKAGING' || fieldType === 'DATE_OF_IMPORT') {
        return ['FRONT', 'BACK', 'NECK', 'SHOULDER', 'CAP', 'BOTTOM'];
      }
      if (fieldType === 'NET_QUANTITY' || fieldType === 'GENERIC_NAME') {
        return ['FRONT', 'BACK'];
      }
      return ['BACK', 'FRONT'];

    case 'SACHET':
    case 'POUCH':
    case 'WRAPPER':
      if (fieldType === 'MRP') {
        return ['FRONT', 'BACK', 'TOP_SEAL', 'BOTTOM_SEAL', 'CRIMP'];
      }
      if (fieldType === 'DATE_OF_MANUFACTURE' || fieldType === 'DATE_OF_PACKAGING' || fieldType === 'DATE_OF_IMPORT') {
        return ['FRONT', 'BACK', 'TOP_SEAL', 'BOTTOM_SEAL', 'CRIMP'];
      }
      if (fieldType === 'NET_QUANTITY' || fieldType === 'GENERIC_NAME') {
        return ['FRONT', 'BACK'];
      }
      return ['BACK', 'FRONT'];

    case 'JAR':
    case 'CAN':
      if (fieldType === 'MRP') {
        return ['FRONT', 'BACK', 'LID', 'CAP', 'BOTTOM'];
      }
      if (fieldType === 'DATE_OF_MANUFACTURE' || fieldType === 'DATE_OF_PACKAGING' || fieldType === 'DATE_OF_IMPORT') {
        return ['FRONT', 'BACK', 'BOTTOM', 'LID', 'CAP'];
      }
      if (fieldType === 'NET_QUANTITY' || fieldType === 'GENERIC_NAME') {
        return ['FRONT', 'BACK'];
      }
      return ['BACK', 'FRONT'];

    case 'CARTON':
    case 'BOX':
      if (fieldType === 'MRP') {
        return ['TOP', 'BOTTOM', 'BACK', 'FLAP', 'FRONT'];
      }
      if (fieldType === 'DATE_OF_MANUFACTURE' || fieldType === 'DATE_OF_PACKAGING' || fieldType === 'DATE_OF_IMPORT') {
        return ['TOP', 'BOTTOM', 'BACK', 'FLAP', 'FRONT'];
      }
      if (fieldType === 'NET_QUANTITY' || fieldType === 'GENERIC_NAME') {
        return ['FRONT', 'BACK', 'TOP'];
      }
      return ['BACK', 'FRONT', 'LEFT', 'RIGHT'];

    case 'TUBE':
      if (fieldType === 'MRP' || fieldType === 'DATE_OF_PACKAGING' || fieldType === 'DATE_OF_MANUFACTURE') {
        return ['CRIMP', 'TOP_SEAL', 'BACK', 'FRONT'];
      }
      return ['FRONT', 'BACK'];

    case 'BLISTER_PACK':
      if (fieldType === 'MRP' || fieldType === 'DATE_OF_PACKAGING' || fieldType === 'DATE_OF_MANUFACTURE') {
        return ['BACK', 'EDGE', 'FRONT'];
      }
      return ['BACK', 'FRONT'];

    case 'UNKNOWN':
    default:
      // Conservative generic guidance
      if (fieldType === 'MRP') {
        return ['FRONT', 'BACK', 'NECK', 'CAP', 'TOP_SEAL', 'BOTTOM_SEAL', 'CRIMP', 'TOP', 'BOTTOM'];
      }
      if (fieldType === 'DATE_OF_MANUFACTURE' || fieldType === 'DATE_OF_PACKAGING' || fieldType === 'DATE_OF_IMPORT') {
        return ['FRONT', 'BACK', 'NECK', 'CAP', 'TOP_SEAL', 'BOTTOM_SEAL', 'CRIMP', 'TOP', 'BOTTOM'];
      }
      return ['FRONT', 'BACK'];
  }
}
