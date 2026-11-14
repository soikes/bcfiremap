import { Layer, Source } from 'react-map-gl/maplibre';
import { FIRE_ZONES_URL } from '../constants/map';

/** Draws BC fire zone outlines and names from a remote GeoJSON URL as one source with a line layer and a symbol layer. */
export function FireZones() {
  return (
    <Source id="fire-zones" type="geojson" data={FIRE_ZONES_URL}>
      <Layer
        id="fire-zone-outlines"
        type="line"
        paint={{ 'line-color': 'rgba(220, 80, 20, 0.8)', 'line-width': 1 }}
      />
      <Layer
        id="fire-zone-labels"
        type="symbol"
        layout={{
          'text-field': ['get', 'FIRE_ZONE'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 10,
        }}
        paint={{
          'text-color': '#000',
          'text-halo-color': '#fff',
          'text-halo-width': 1.5,
        }}
      />
    </Source>
  );
}
