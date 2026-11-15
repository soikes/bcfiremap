import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { permissionColor } from '../constants/banStyle';
import { FireBan } from '../types/ban';
import { bansToFeatureCollection } from '../utils/geometry';
import { logger } from '../utils/logger';

interface Props {
  bans: FireBan[];
}

/** Draws each ban's jurisdiction as one source with a fill layer and a line layer, red where the activity is prohibited, amber where it is by permit only and green where it is allowed. */
export function BanPolygons({ bans }: Props) {
  const data = useMemo(() => {
    const collection = bansToFeatureCollection(bans);
    logger.log('[BanPolygons] features', collection.features.length);
    return collection;
  }, [bans]);

  return (
    <Source id="bans" type="geojson" data={data}>
      <Layer id="ban-fill" type="fill" paint={{ 'fill-color': permissionColor('fill') }} />
      <Layer id="ban-outline" type="line" paint={{ 'line-color': permissionColor('stroke'), 'line-width': 2 }} />
    </Source>
  );
}
