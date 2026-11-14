import type { MultiPolygon, Polygon } from 'geojson';
import type { AREA_KINDS } from '../constants/area';

export type AreaKind = (typeof AREA_KINDS)[number];

/** A named place with a boundary: a fire zone, a regional district, a municipality, a park, and so on. */
export interface Area {
  id: string;
  name: string;
  kind: AreaKind;
  parentName?: string;
  authorityId?: string;
  source: string;
  geometry: Polygon | MultiPolygon;
}

/** Where a ban binds inside its declared area: the area kinds it skips, and the kinds that override the skip. */
export interface Applicability {
  excludeAreaKinds: AreaKind[];
  includeAreaKinds: AreaKind[];
}
