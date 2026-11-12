import 'maplibre-gl/dist/maplibre-gl.css';
import MapLibreMap, { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { BASEMAP_STYLE, INITIAL_VIEW } from '../constants/map';
import { BaseMapProps } from './BaseMap.types';

/** Full-size web MapLibre map centred on BC that reports clicks as a LatLng. */
export function BaseMap({ onPress, children }: BaseMapProps) {
  function handleClick(e: MapLayerMouseEvent) {
    onPress({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
  }

  return (
    <MapLibreMap
      initialViewState={INITIAL_VIEW}
      mapStyle={BASEMAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      onClick={handleClick}
    >
      {children}
    </MapLibreMap>
  );
}
