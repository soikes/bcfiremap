import type { Geometry, MultiPolygon, Polygon, Position } from 'geojson';
import polygonClipping, { Polygon as ClipPolygon } from 'polygon-clipping';
import { FIRE_ZONES_URL } from '../constants/map';
import { FireBan } from '../types/ban';
import { logger } from '../utils/logger';
import { fetchJson } from './fetchJson';
import { Collector } from './types';

interface ZoneFeature {
  properties?: { FIRE_ZONE?: string; FIRE_CENTRE?: string } | null;
  geometry?: Geometry | null;
}

/** Builds a closed rectangular Polygon from its edges. */
const rect = (south: number, west: number, north: number, east: number): Polygon => ({
  type: 'Polygon',
  coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
});

/** Merges zone features into one outline: their union, keeping only outer boundaries. Null if there are no zones. */
const merge = (zones: ZoneFeature[]): Polygon | MultiPolygon | null => {
  const parts: Position[][][] = zones.flatMap(({ geometry }) => {
    if (geometry?.type === 'Polygon') return [geometry.coordinates];
    if (geometry?.type === 'MultiPolygon') return geometry.coordinates;
    return [];
  });
  if (parts.length === 0) return null;
  const [first, ...rest] = parts as ClipPolygon[];
  const outlines = polygonClipping.union(first, ...rest).map(([outer]) => [outer]);
  return outlines.length === 1
    ? { type: 'Polygon', coordinates: outlines[0] }
    : { type: 'MultiPolygon', coordinates: outlines };
};

const LOCAL_BANS: FireBan[] = [
  {
    id: 'example:rd-thompson-nicola',
    source: 'example',
    level: 'regional-district',
    region: 'Thompson-Nicola Regional District',
    type: 'open-burning',
    description: 'Category 2 and 3 open burning is prohibited throughout the Thompson-Nicola Regional District.',
    effectiveDate: '2026-06-15',
    geometry: rect(50, -121.5, 51.5, -119.8),
  },
  {
    id: 'example:rd-central-okanagan',
    source: 'example',
    level: 'regional-district',
    region: 'Central Okanagan Regional District',
    type: 'open-burning',
    description: 'Open burning is prohibited throughout the Central Okanagan Regional District.',
    effectiveDate: '2026-06-20',
    geometry: rect(49.7, -119.9, 50.2, -119),
  },
  {
    id: 'example:muni-kamloops',
    source: 'example',
    level: 'municipal',
    region: 'City of Kamloops',
    type: 'all-fires',
    description: 'All open fires, including campfires and fire pits, are prohibited within City of Kamloops limits.',
    effectiveDate: '2026-06-01',
    geometry: rect(50.62, -120.65, 50.78, -120.2),
  },
  {
    id: 'example:muni-kelowna',
    source: 'example',
    level: 'municipal',
    region: 'City of Kelowna',
    type: 'category2-3',
    description: 'Category 2 and 3 open burning is prohibited within City of Kelowna limits year-round.',
    effectiveDate: '2026-05-15',
    geometry: rect(49.8, -119.65, 49.97, -119.35),
  },
];

/** Builds example bans from real fire zone polygons (one fire-centre-wide outline and one single zone) plus hand-drawn local ones. */
export function buildExampleBans(zones: unknown): FireBan[] {
  const features = (zones as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) throw new Error('Example collector got no fire zone features');
  const zoneFeatures = features as ZoneFeature[];

  const centreGeometry = merge(zoneFeatures.filter(z => z.properties?.FIRE_CENTRE === 'Kamloops Fire Centre'));
  const zoneGeometry = merge(zoneFeatures.filter(z => z.properties?.FIRE_ZONE === 'Penticton Fire Zone'));

  const provincial: FireBan[] = [];
  if (centreGeometry) {
    provincial.push({
      id: 'example:kamloops-fire-centre',
      source: 'example',
      level: 'provincial',
      region: 'Kamloops Fire Centre',
      type: 'campfire',
      title: 'Campfire · Category 1',
      description: 'Category 1 campfires are prohibited.',
      effectiveDate: '2026-07-01',
      geometry: centreGeometry,
    });
  } else {
    logger.log('[example] Kamloops Fire Centre zones not found');
  }
  if (zoneGeometry) {
    provincial.push({
      id: 'example:penticton-fire-zone',
      source: 'example',
      level: 'provincial',
      region: 'Penticton Fire Zone',
      type: 'category2-3',
      title: 'Open fire · Category 2 and 3',
      description: 'Category 2 and Category 3 open fires are prohibited.',
      effectiveDate: '2026-06-15',
      geometry: zoneGeometry,
    });
  } else {
    logger.log('[example] Penticton Fire Zone not found');
  }

  logger.log('[example] built bans', provincial.length + LOCAL_BANS.length);
  return [...provincial, ...LOCAL_BANS];
}

export const exampleCollector: Collector = {
  id: 'example',
  name: 'Example data (not real)',
  coverage: 'Shapes follow the real fire zones; the bans themselves are made up, for development only.',
  attribution: '',
  refetchIntervalMs: 60 * 60 * 1000,
  collect: async signal => buildExampleBans(await fetchJson(FIRE_ZONES_URL, signal)),
};
