import type { Geometry, MultiPolygon, Polygon } from 'geojson';
import { FireBan } from '../types/ban';
import { logger } from '../utils/logger';
import { classifyBan } from './classifyBan';
import { fetchJson } from './fetchJson';
import { Collector } from './types';

const SOURCE_ID = 'bcws';

const LAYER_URL =
  'https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/British_Columbia_Bans_and_Prohibition_Areas_-_View/FeatureServer/14/query';

const QUERY = [
  'where=1%3D1',
  'outFields=*',
  'outSR=4326',
  'f=geojson',
  'geometryPrecision=5',
  'maxAllowableOffset=0.001',
].join('&');

export const PROVINCIAL_URL = `${LAYER_URL}?${QUERY}`;

type Properties = Record<string, unknown>;

/** Returns a trimmed non-empty string, or undefined for anything else. */
const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** Converts an epoch-millisecond timestamp to a YYYY-MM-DD string, or undefined if it isn't a valid date. */
const isoDate = (value: unknown): string | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

/** Returns the value only if it is an https URL. */
const httpsUrl = (value: unknown): string | undefined => {
  const url = text(value);
  return url?.startsWith('https://') ? url : undefined;
};

/** Narrows a GeoJSON geometry to an area (Polygon or MultiPolygon). */
const isArea = (geometry: Geometry | null | undefined): geometry is Polygon | MultiPolygon =>
  geometry?.type === 'Polygon' || geometry?.type === 'MultiPolygon';

/** Converts one BC Wildfire Service GeoJSON feature to a FireBan, or null if it can't be used. */
function toBan(feature: unknown): FireBan | null {
  if (typeof feature !== 'object' || feature === null) return null;
  const { id, properties, geometry } = feature as {
    id?: unknown;
    properties?: Properties | null;
    geometry?: Geometry | null;
  };
  const props = properties ?? {};

  if (!isArea(geometry)) {
    logger.log('[bcws] skipping feature without an area geometry', id);
    return null;
  }

  const sourceId = props.PROT_BAP_SYSID ?? props.OBJECTID ?? id;
  if (sourceId === undefined || sourceId === null) {
    logger.log('[bcws] skipping feature without an id');
    return null;
  }

  const titleParts = [...new Set([text(props.TYPE), text(props.CATEGORY)].filter(Boolean))];
  const title = titleParts.length > 0 ? titleParts.join(' · ') : undefined;
  const description = text(props.ACCESS_PROHIBITION_DESCRIPTION) ?? '';

  return {
    id: `${SOURCE_ID}:${String(sourceId)}`,
    source: SOURCE_ID,
    level: 'provincial',
    region: text(props.FIRE_ZONE_NAME) ?? text(props.FIRE_CENTRE_NAME) ?? 'British Columbia',
    type: classifyBan([title, description].filter(Boolean).join(' ')),
    title,
    description,
    effectiveDate: isoDate(props.ACCESS_STATUS_EFFECTIVE_DATE),
    url: httpsUrl(props.BULLETIN_URL),
    geometry,
  };
}

/** Validates an ArcGIS GeoJSON response and converts its features to FireBans, skipping unusable ones. */
export function parseProvincialBans(body: unknown): FireBan[] {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Unexpected response from BC Wildfire Service');
  }
  const { error, features, exceededTransferLimit } = body as {
    error?: { message?: unknown };
    features?: unknown;
    exceededTransferLimit?: unknown;
  };
  if (error) throw new Error(`BC Wildfire Service error: ${text(error.message) ?? 'unknown'}`);
  if (!Array.isArray(features)) throw new Error('BC Wildfire Service response has no features list');
  if (exceededTransferLimit) logger.error('[bcws] result truncated at the service record limit');

  const bans = features.map(toBan).filter((ban): ban is FireBan => ban !== null);
  logger.log('[bcws] parsed bans', bans.length, 'of', features.length, 'features');
  return bans;
}

export const provincialCollector: Collector = {
  id: SOURCE_ID,
  name: 'BC Wildfire Service',
  coverage: 'Provincial orders only. Municipal and regional district bans are not included.',
  attribution: 'Contains information licensed under the Open Government Licence – British Columbia.',
  refetchIntervalMs: 10 * 60 * 1000,
  collect: async signal => {
    logger.log('[bcws] fetching bans');
    return parseProvincialBans(await fetchJson(PROVINCIAL_URL, signal));
  },
};
