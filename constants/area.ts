import type { Applicability } from '../types/area';

/** Every kind of area a ban can be declared for or applied within. */
export const AREA_KINDS = [
  'fire-centre',
  'fire-zone',
  'regional-district',
  'electoral-area',
  'municipality',
  'provincial-park',
  'recreation-site',
  'wildlife-management-area',
  'private-managed-forest',
  'regional-park',
  'national-park',
  'reserve',
] as const;

/** BC Wildfire Service orders skip municipalities, except for these provincially managed lands inside them. */
export const BCWS_APPLICABILITY: Applicability = {
  excludeAreaKinds: ['municipality'],
  includeAreaKinds: ['provincial-park', 'recreation-site', 'wildlife-management-area', 'private-managed-forest'],
};
