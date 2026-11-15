import { LatLng, Place } from '../types/geo';
import { logger } from './logger';
import { fetchJson } from './web';

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const MAX_RESULTS = 5;
/** Rough box around British Columbia as `west,north,east,south`, the order Nominatim's `viewbox` takes. */
const BC_VIEWBOX = '-139.06,60,-114.03,48.3';

/** Reads a Nominatim result as a place, or null if it has no name or a usable position. */
function parsePlace(item: unknown): Place | null {
  if (typeof item !== 'object' || item === null) return null;
  const { display_name: name, lat, lon } = item as Record<string, unknown>;
  const location: LatLng = { latitude: Number(lat), longitude: Number(lon) };
  if (typeof name !== 'string' || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return null;
  return { name, location };
}

/** Looks a place name or address up in British Columbia with OpenStreetMap's Nominatim; an empty query returns no places and makes no request, and an answer that isn't a list throws. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const text = query.trim();
  if (!text) return [];
  const params = new URLSearchParams({
    q: text,
    format: 'jsonv2',
    countrycodes: 'ca',
    viewbox: BC_VIEWBOX,
    bounded: '1',
    limit: String(MAX_RESULTS),
  });
  logger.log('[geocode] searching for', text);
  const body = await fetchJson(`${SEARCH_URL}?${params}`, signal);
  if (!Array.isArray(body)) throw new Error('Place search returned an unexpected response');
  const places = body.flatMap(item => parsePlace(item) ?? []);
  logger.log('[geocode] found', places.length, 'of', body.length, 'results');
  return places;
}
