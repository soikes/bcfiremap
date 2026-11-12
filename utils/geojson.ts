import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';
import { FireBan } from '../types/ban';
import { LatLng } from '../types/geo';

/** Converts fire bans to GeoJSON features carrying each ban's id, level and region. */
export function bansToFeatureCollection(bans: FireBan[]): FeatureCollection<Polygon | MultiPolygon> {
  const features = bans.map((ban): Feature<Polygon | MultiPolygon> => ({
    type: 'Feature',
    id: ban.id,
    properties: { id: ban.id, level: ban.level, region: ban.region },
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
