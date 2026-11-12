import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';
import { FireBan } from '../data/fireBans';
import { LatLng } from '../types/geo';

/** Converts a LatLng to a GeoJSON [lng, lat] position. */
const toPosition = ({ latitude, longitude }: LatLng): [number, number] => [longitude, latitude];

/** Returns the ring with its first position repeated at the end if it isn't already closed. */
const closeRing = (ring: LatLng[]): LatLng[] => {
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first.latitude === last.latitude && first.longitude === last.longitude ? ring : [...ring, first];
};

/** Converts fire bans to GeoJSON polygons carrying each ban's id, level and region. */
export function bansToFeatureCollection(bans: FireBan[]): FeatureCollection<Polygon> {
  const features = bans.map((ban): Feature<Polygon> => ({
    type: 'Feature',
    id: ban.id,
    properties: { id: ban.id, level: ban.level, region: ban.region },
    geometry: { type: 'Polygon', coordinates: [closeRing(ban.polygon).map(toPosition)] },
  }));
  return { type: 'FeatureCollection', features };
}

/** Converts a single location to a one-point GeoJSON FeatureCollection. */
export function pointToFeatureCollection(coordinate: LatLng): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: toPosition(coordinate) } }],
  };
}
