import { useMemo } from 'react';
import { FireZone } from '../hooks/useFireZones';
import { zoneLabelsToFeatureCollection } from '../utils/geojson';
import { logger } from '../utils/logger';
import { MapLayer } from './MapLayer';
import { MapSource } from './MapSource';

interface Props {
  zones: FireZone[];
}

/** Draws each zone's name at its centroid as one source and one symbol layer. */
export function ZoneLabels({ zones }: Props) {
  const data = useMemo(() => {
    const collection = zoneLabelsToFeatureCollection(zones);
    logger.log('[ZoneLabels] features', collection.features.length);
    return collection;
  }, [zones]);

  return (
    <MapSource id="zone-labels" data={data}>
      <MapLayer
        id="zone-label-text"
        type="symbol"
        layout={{
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 10,
        }}
        paint={{
          'text-color': '#000',
          'text-halo-color': '#fff',
          'text-halo-width': 1.5,
        }}
      />
    </MapSource>
  );
}
