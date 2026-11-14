import { CRD_AUTHORITY } from '../constants/authority';
import { Area } from '../types/area';
import { logger } from '../utils/logger';
import { fetchAreas } from '../utils/abms';

const CRD_NAME = 'Capital Regional District';

/** Fetches the CRD, its three electoral areas and its thirteen municipalities, tagged with the CRD as their authority where the CRD governs them. */
export async function fetchCrdAreas(signal?: AbortSignal): Promise<Area[]> {
  const [regionalDistricts, electoralAreas, municipalities] = await Promise.all([
    fetchAreas('regional-district', `ADMIN_AREA_NAME='${CRD_NAME}'`, signal),
    fetchAreas('electoral-area', `ADMIN_AREA_GROUP_NAME='${CRD_NAME}'`, signal),
    fetchAreas('municipality', `ADMIN_AREA_GROUP_NAME='${CRD_NAME}'`, signal),
  ]);
  const areas = [
    ...regionalDistricts,
    ...electoralAreas.map(area => ({ ...area, authorityId: CRD_AUTHORITY.id })),
    ...municipalities,
  ];
  logger.log('[crd] areas', areas.length);
  return areas;
}
