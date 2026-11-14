import { Area, AreaKind } from '../types/area';
import { FireBan } from '../types/ban';
import { LatLng } from '../types/geo';
import { pointInGeometry } from './geometry';

/** Returns the areas that contain the location. */
export const areasAt = (areas: Area[], location: LatLng): Area[] =>
  areas.filter(area => pointInGeometry(location, area.geometry));

/** True if the ban binds at the location: its declared area is not cancelled by an excluded kind of area, unless an overriding kind also contains the location. */
export function appliesAt(ban: FireBan, location: LatLng, areas: Area[]): boolean {
  if (!ban.applicability) return true;
  const kinds = new Set<AreaKind>(areasAt(areas, location).map(area => area.kind));
  const excluded = ban.applicability.excludeAreaKinds.some(kind => kinds.has(kind));
  const overridden = ban.applicability.includeAreaKinds.some(kind => kinds.has(kind));
  return !excluded || overridden;
}
