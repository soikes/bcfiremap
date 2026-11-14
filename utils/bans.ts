import { LOAD_STATUSES } from '../constants/api';
import { BAN_LEVELS, BAN_TYPES } from '../constants/ban';
import { BansResponse, SourceStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { logger } from './logger';

type Fields = Record<string, unknown>;

/** True if the value is a non-null object. */
const isObject = (value: unknown): value is Fields => typeof value === 'object' && value !== null;

/** True if the value is undefined or a string. */
const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';

/** True if the value is one of the allowed strings. */
const isOneOf = (allowed: readonly string[], value: unknown) => typeof value === 'string' && allowed.includes(value);

/** True if the value is a Polygon or MultiPolygon with a coordinates list. */
const isArea = (value: unknown) =>
  isObject(value) && (value.type === 'Polygon' || value.type === 'MultiPolygon') && Array.isArray(value.coordinates);

/** True if the value has every field the map and panel rely on, with an https bulletin URL if it has one. */
export function isFireBan(value: unknown): value is FireBan {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    isOneOf(BAN_LEVELS, value.level) &&
    typeof value.region === 'string' &&
    isOneOf(BAN_TYPES, value.type) &&
    typeof value.description === 'string' &&
    isOptionalString(value.title) &&
    isOptionalString(value.effectiveDate) &&
    isOptionalString(value.expiryDate) &&
    (value.url === undefined || (typeof value.url === 'string' && value.url.startsWith('https://'))) &&
    isArea(value.geometry)
  );
}

/** True if the value has every field the panel shows for a source. */
export function isSourceStatus(value: unknown): value is SourceStatus {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.coverage === 'string' &&
    typeof value.attribution === 'string' &&
    isOneOf(LOAD_STATUSES, value.status) &&
    typeof value.hasData === 'boolean' &&
    typeof value.retrying === 'boolean' &&
    typeof value.updatedAt === 'number'
  );
}

/** Keeps the items that pass `check`, logging how many were dropped; throws if `value` is not a list. */
function validItems<T>(value: unknown, check: (item: unknown) => item is T, what: string, from: string): T[] {
  if (!Array.isArray(value)) throw new Error(`${from} returned ${what} that are not a list`);
  const valid = value.filter(check);
  if (valid.length < value.length) logger.error(`[bans] dropped invalid ${what} from ${from}`, value.length - valid.length);
  return valid;
}

/** Returns the valid bans from a collector's result, dropping the rest; throws if the result is not a list. */
export const validBans = (value: unknown, from: string): FireBan[] => validItems(value, isFireBan, 'bans', from);

/** Checks a /api/bans answer and returns its valid bans and sources; throws if it is not that shape. */
export function parseBansResponse(body: unknown): BansResponse {
  if (!isObject(body)) throw new Error('Server returned an unexpected response');
  return {
    bans: validItems(body.bans, isFireBan, 'bans', 'server'),
    sources: validItems(body.sources, isSourceStatus, 'sources', 'server'),
  };
}

/** Returns the sources that failed and have no data to show. */
export const failedSources = (sources: SourceStatus[]) =>
  sources.filter(source => source.status === 'error' && !source.hasData);

/** Returns the sources whose last attempt failed and that are trying again. */
export const retryingSources = (sources: SourceStatus[]) => sources.filter(source => source.retrying);
