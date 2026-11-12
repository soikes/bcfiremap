import { useMemo } from 'react';
import { LatLng } from '../types/geo';
import { pointToFeatureCollection } from '../utils/geojson';
import { MapLayer } from './MapLayer';
import { MapSource } from './MapSource';

interface Props {
  coordinate: LatLng;
}

/** Draws a dot at the tapped location as one source and one circle layer. */
export function SelectedPin({ coordinate }: Props) {
  const data = useMemo(() => pointToFeatureCollection(coordinate), [coordinate]);

  return (
    <MapSource id="selected-pin" data={data}>
      <MapLayer
        id="selected-pin-dot"
        type="circle"
        paint={{
          'circle-radius': 7,
          'circle-color': '#111',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2.5,
        }}
      />
    </MapSource>
  );
}
