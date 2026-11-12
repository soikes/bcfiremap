import { useMemo } from 'react';
import { FireZone } from '../hooks/useFireZones';
import { zonesToFeatureCollection } from '../utils/geojson';
import { logger } from '../utils/logger';
import { MapLayer } from './MapLayer';
import { MapSource } from './MapSource';

interface Props {
  zones: FireZone[];
}

/** Draws the provincial fire zone outlines as one source and one line layer. */
export function FireZoneOutlines({ zones }: Props) {
  const data = useMemo(() => {
    const collection = zonesToFeatureCollection(zones);
    logger.log('[FireZoneOutlines] features', collection.features.length);
    return collection;
  }, [zones]);

  return (
    <MapSource id="fire-zones" data={data}>
      <MapLayer
        id="fire-zone-outlines"
        type="line"
        paint={{ 'line-color': 'rgba(220, 80, 20, 0.8)', 'line-width': 1 }}
      />
    </MapSource>
  );
}
