import { abmsUrl, parseAreas } from '../utils/abms';
import { logger } from '../utils/logger';
import { fetchJson } from '../utils/web';

const OUT_PATH = new URL('../data/boundaries/municipalities.json', import.meta.url);
const REGION = 'Capital Regional District';
const EXPECTED_COUNT = 13;
const TIMEOUT_MS = 60000;

/** Writes a GeoJSON FeatureCollection with one feature per line, so a refresh shows up in git as per-municipality changes. */
function serialize(features: unknown[], fetchedAt: string, sourceUrl: string): string {
  const header = {
    type: 'FeatureCollection',
    source: 'Municipalities - Legally Defined Administrative Areas of BC (WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP)',
    licence: 'Open Government Licence - British Columbia',
    fetchedAt,
    sourceUrl,
  };
  const head = JSON.stringify(header).slice(0, -1);
  return `${head},"features":[\n${features.map(feature => JSON.stringify(feature)).join(',\n')}\n]}\n`;
}

/** Fetches the CRD's municipal boundaries from ABMS and stores them in the repo. */
async function main() {
  const url = abmsUrl('municipality', `ADMIN_AREA_GROUP_NAME='${REGION}'`);
  logger.log('[boundaries] fetching', url);
  const body = await fetchJson(url, undefined, TIMEOUT_MS);
  const areas = parseAreas(body, 'municipality');
  if (areas.length !== EXPECTED_COUNT) throw new Error(`Expected ${EXPECTED_COUNT} municipalities, got ${areas.length}`);
  const features = (body as { features: { properties: { ADMIN_AREA_ABBREVIATION: string } }[] }).features
    .slice()
    .sort((a, b) => a.properties.ADMIN_AREA_ABBREVIATION.localeCompare(b.properties.ADMIN_AREA_ABBREVIATION));
  await Bun.write(OUT_PATH, serialize(features, new Date().toISOString(), url));
  logger.log('[boundaries] wrote', features.length, 'municipalities to', OUT_PATH.pathname, areas.map(area => area.name).sort());
}

await main();
