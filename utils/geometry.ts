import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon, Position } from 'geojson';
import { FireBan } from '../types/ban';
import { active } from './bans';
import { LatLng } from '../types/geo';

/** True if the point is inside the ring, by counting how many of its edges a ray from the point crosses. */
export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const { latitude: py, longitude: px } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { latitude: iy, longitude: ix } = polygon[i];
    const { latitude: jy, longitude: jx } = polygon[j];
    if (
      (iy > py) !== (jy > py) &&
      px < ((jx - ix) * (py - iy)) / (jy - iy) + ix
    ) {
      inside = !inside;
    }
  }
  return inside;
}

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

/** Converts fire bans to GeoJSON features carrying each ban's id, level, region and whether it is active. */
export function bansToFeatureCollection(bans: FireBan[]): FeatureCollection<Polygon | MultiPolygon> {
  const features = bans.map((ban): Feature<Polygon | MultiPolygon> => ({
    type: 'Feature',
    id: ban.id,
    properties: { id: ban.id, level: ban.level, region: ban.region, active: active(ban) },
    geometry: ban.geometry,
  }));
  return { type: 'FeatureCollection', features };
}

/** Converts a single location to a one-point GeoJSON FeatureCollection. */
export function pointToFeatureCollection({ latitude, longitude }: LatLng): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [longitude, latitude] } }],
  };
}
