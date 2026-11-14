import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import { LatLng } from '../types/geo';
import { pointToFeatureCollection } from '../utils/geojson';

interface Props {
  coordinate: LatLng;
}

/** Draws a dot at the tapped location as one source and one circle layer. */
export function SelectedPin({ coordinate }: Props) {
  const data = useMemo(() => pointToFeatureCollection(coordinate), [coordinate]);

  return (
    <Source id="selected-pin" type="geojson" data={data}>
      <Layer
        id="selected-pin-dot"
        type="circle"
        paint={{
          'circle-radius': 7,
          'circle-color': '#111',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2.5,
        }}
      />
    </Source>
  );
}
