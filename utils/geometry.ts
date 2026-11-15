import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon, Position } from 'geojson';
import polygonClipping, { Geom } from 'polygon-clipping';
import { PERMISSIONS } from '../constants/ban';
import { FireBan } from '../types/ban';
import { permissionAt } from './bans';
import { LatLng } from '../types/geo';
import { logger } from './logger';

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

/** Returns a GeoJSON feature carrying the permission, with a ban's own geometry. */
const permissionFeature = (permission: string, geometry: Polygon | MultiPolygon): Feature<Polygon | MultiPolygon> => ({
  type: 'Feature',
  properties: { permission },
  geometry,
});

/** Converts fire bans to GeoJSON features, one per permission, each covering only the places where that permission is the strictest any ban gives there (so overlapping bans show just their strictest colour). Falls back to one feature per ban if the shapes can't be combined. */
export function bansToFeatureCollection(bans: FireBan[], now = new Date()): FeatureCollection<Polygon | MultiPolygon> {
  const features: Feature<Polygon | MultiPolygon>[] = [];
  try {
    const stricter: Geom[] = [];
    for (const permission of PERMISSIONS) {
      const shapes = bans.filter(ban => permissionAt(ban, now) === permission).map(ban => ban.geometry.coordinates as Geom);
      if (shapes.length === 0) continue;
      const [first, ...rest] = shapes;
      const covered = polygonClipping.union(first, ...rest);
      const visible = stricter.length > 0 ? polygonClipping.difference(covered, ...stricter) : covered;
      logger.log('[geometry]', permission, 'covers', shapes.length, 'bans,', visible.length, 'visible parts');
      if (visible.length > 0) features.push(permissionFeature(permission, { type: 'MultiPolygon', coordinates: visible }));
      stricter.push(covered);
    }
  } catch (error) {
    logger.error('[geometry] could not layer the bans by permission, drawing each one on its own', error);
    return {
      type: 'FeatureCollection',
      features: bans.map(ban => permissionFeature(permissionAt(ban, now), ban.geometry)),
    };
  }
  return { type: 'FeatureCollection', features };
}

/** Converts a single location to a one-point GeoJSON FeatureCollection. */
export function pointToFeatureCollection({ latitude, longitude }: LatLng): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [longitude, latitude] } }],
  };
}
