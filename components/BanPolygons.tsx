import { useMemo } from 'react';
import { levelColor } from '../constants/banStyle';
import { FireBan } from '../types/ban';
import { bansToFeatureCollection } from '../utils/geojson';
import { logger } from '../utils/logger';
import { MapLayer } from './MapLayer';
import { MapSource } from './MapSource';

interface Props {
  bans: FireBan[];
}

/** Draws each ban's jurisdiction as one source with a fill layer and a line layer, coloured by level. */
export function BanPolygons({ bans }: Props) {
  const data = useMemo(() => {
    const collection = bansToFeatureCollection(bans);
    logger.log('[BanPolygons] features', collection.features.length);
    return collection;
  }, [bans]);

  return (
    <MapSource id="bans" data={data}>
      <MapLayer id="ban-fill" type="fill" paint={{ 'fill-color': levelColor('fill') }} />
      <MapLayer id="ban-outline" type="line" paint={{ 'line-color': levelColor('stroke'), 'line-width': 2 }} />
    </MapSource>
  );
}
