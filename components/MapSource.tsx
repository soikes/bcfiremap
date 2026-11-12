import { GeoJSONSource } from '@maplibre/maplibre-react-native';
import type { GeoJSON } from 'geojson';
import { ReactNode } from 'react';

interface MapSourceProps {
  id: string;
  data: GeoJSON | string;
  children?: ReactNode;
}

/** GeoJSON data source for the native map, from an object or a URL; nested layers draw from it. */
export function MapSource({ id, data, children }: MapSourceProps) {
  return (
    <GeoJSONSource id={id} data={data}>
      {children}
    </GeoJSONSource>
  );
}
