import type { GeoJSON } from 'geojson';
import { ReactNode } from 'react';
import { Source } from 'react-map-gl/maplibre';

interface MapSourceProps {
  id: string;
  data: GeoJSON | string;
  children?: ReactNode;
}

/** GeoJSON data source for the web map, from an object or a URL; nested layers draw from it. */
export function MapSource({ id, data, children }: MapSourceProps) {
  return (
    <Source id={id} type="geojson" data={data}>
      {children}
    </Source>
  );
}
