import type { MultiPolygon, Polygon, Position } from 'geojson';
import { LatLng } from '../types/geo';
import { pointInPolygon } from './pointInPolygon';

/** Converts a GeoJSON ring of [lng, lat] positions to LatLngs. */
const toRing = (ring: Position[]): LatLng[] =>
  ring.map(([longitude, latitude]) => ({ latitude, longitude }));

/** True if the point is inside the polygon's outer ring and outside all of its holes. */
function inPolygon(point: LatLng, rings: Position[][]): boolean {
  const [outer, ...holes] = rings;
  if (!outer) return false;
  return pointInPolygon(point, toRing(outer)) && !holes.some(hole => pointInPolygon(point, toRing(hole)));
}

/** True if the point lies inside a Polygon or any part of a MultiPolygon, respecting holes. */
export function pointInGeometry(point: LatLng, geometry: Polygon | MultiPolygon): boolean {
  return geometry.type === 'Polygon'
    ? inPolygon(point, geometry.coordinates)
    : geometry.coordinates.some(rings => inPolygon(point, rings));
}
