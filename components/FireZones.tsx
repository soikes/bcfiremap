import { FIRE_ZONES_URL } from '../constants/map';
import { MapLayer } from './MapLayer';
import { MapSource } from './MapSource';

/** Draws BC fire zone outlines and names from a remote GeoJSON URL as one source with a line layer and a symbol layer. */
export function FireZones() {
  return (
    <MapSource id="fire-zones" data={FIRE_ZONES_URL}>
      <MapLayer
        id="fire-zone-outlines"
        type="line"
        paint={{ 'line-color': 'rgba(220, 80, 20, 0.8)', 'line-width': 1 }}
      />
      <MapLayer
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
    </MapSource>
  );
}
