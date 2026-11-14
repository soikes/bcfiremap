import type { Geometry, MultiPolygon, Polygon } from 'geojson';
import { Area, AreaKind } from '../types/area';
import { logger } from './logger';
import { fetchJson } from './web';

export const ABMS_SOURCE_ID = 'abms';

const BASE_URL =
  'https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_legal_admin_boundaries/MapServer';

const LAYER_IDS: Partial<Record<AreaKind, number>> = {
  'regional-district': 16,
  municipality: 18,
  'electoral-area': 24,
};

/** Builds the query URL for one kind of legally defined administrative area, filtered by an ArcGIS `where` clause. */
export function abmsUrl(kind: AreaKind, where: string): string {
  const layer = LAYER_IDS[kind];
  if (layer === undefined) throw new Error(`No ABMS layer for area kind ${kind}`);
  const query = new URLSearchParams({
    where,
    outFields: 'LGL_ADMIN_AREA_ID,ADMIN_AREA_NAME,ADMIN_AREA_ABBREVIATION,ADMIN_AREA_GROUP_NAME',
    outSR: '4326',
    f: 'geojson',
    geometryPrecision: '5',
    maxAllowableOffset: '0.0005',
  });
  return `${BASE_URL}/${layer}/query?${query}`;
}

/** Returns a trimmed non-empty string, or undefined for anything else. */
const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** Narrows a GeoJSON geometry to an area (Polygon or MultiPolygon). */
const isArea = (geometry: Geometry | null | undefined): geometry is Polygon | MultiPolygon =>
  geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';

/** Converts one ABMS GeoJSON feature to an Area, or null if it has no id, name or area geometry. */
function toArea(feature: unknown, kind: AreaKind): Area | null {
  if (typeof feature !== 'object' || feature === null) return null;
  const { properties, geometry } = feature as {
    properties?: Record<string, unknown> | null;
    geometry?: Geometry | null;
  };
  const id = properties?.LGL_ADMIN_AREA_ID;
  const name = text(properties?.ADMIN_AREA_ABBREVIATION) ?? text(properties?.ADMIN_AREA_NAME);
  if ((typeof id !== 'number' && typeof id !== 'string') || !name || !isArea(geometry)) {
    logger.log('[abms] skipping unusable feature', id, name);
    return null;
  }
  return {
    id: `${ABMS_SOURCE_ID}:${kind}:${id}`,
    name,
    kind,
    parentName: text(properties?.ADMIN_AREA_GROUP_NAME),
    source: ABMS_SOURCE_ID,
    geometry,
  };
}

/** Validates an ABMS GeoJSON response and converts its features to Areas of one kind, skipping unusable ones. */
export function parseAreas(body: unknown, kind: AreaKind): Area[] {
  if (typeof body !== 'object' || body === null) throw new Error('Unexpected response from BC administrative boundaries');
  const { error, features } = body as { error?: { message?: unknown }; features?: unknown };
  if (error) throw new Error(`BC administrative boundaries error: ${text(error.message) ?? 'unknown'}`);
  if (!Array.isArray(features)) throw new Error('BC administrative boundaries response has no features list');
  const areas = features.map(feature => toArea(feature, kind)).filter((area): area is Area => area !== null);
  logger.log('[abms] parsed', kind, 'areas', areas.length, 'of', features.length, 'features');
  return areas;
}

/** Fetches the areas of one kind that match an ArcGIS `where` clause. */
export async function fetchAreas(kind: AreaKind, where: string, signal?: AbortSignal): Promise<Area[]> {
  logger.log('[abms] fetching', kind, where);
  return parseAreas(await fetchJson(abmsUrl(kind, where), signal), kind);
}
