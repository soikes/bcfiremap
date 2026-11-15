import 'maplibre-gl/dist/maplibre-gl.css';
import { ReactNode } from 'react';
import MapLibreMap, { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { BASEMAP_STYLE, INITIAL_VIEW } from '../constants/map';
import { LatLng } from '../types/geo';

interface Props {
  onClick: (coordinate: LatLng) => void;
  children?: ReactNode;
}

/** Full-size MapLibre map that opens on the Capital Regional District and reports clicks as a LatLng. */
export function BaseMap({ onClick, children }: Props) {
  function handleClick(e: MapLayerMouseEvent) {
    onClick({ latitude: e.lngLat.lat, longitude: e.lngLat.lng });
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
