import type { MultiPolygon, Polygon, Position } from 'geojson';
import { FireBan } from '../types/ban';
import { Bounds, LatLng } from '../types/geo';

/** Every position of a Polygon or MultiPolygon, flattened. */
const positions = (geometry: Polygon | MultiPolygon): Position[] =>
  geometry.type === 'Polygon' ? geometry.coordinates.flat() : geometry.coordinates.flat(2);

/** The smallest box that contains the point and every ban's area. */
export function focusBounds(bans: FireBan[], point: LatLng): Bounds {
  const all: Position[] = [[point.longitude, point.latitude], ...bans.flatMap(ban => positions(ban.geometry))];
  const lngs = all.map(([lng]) => lng);
  const lats = all.map(([, lat]) => lat);
  return { west: Math.min(...lngs), south: Math.min(...lats), east: Math.max(...lngs), north: Math.max(...lats) };
}
