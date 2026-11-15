import { act } from '@testing-library/react';
import { afterEach, mock } from 'bun:test';
import { ReactNode } from 'react';

interface MapProps {
  initialViewState?: unknown;
  mapStyle?: unknown;
  style?: unknown;
  onClick?: (e: { lngLat: { lat: number; lng: number } }) => void;
  children?: ReactNode;
}

interface SourceProps {
  id: string;
  type: string;
  data: unknown;
  children?: ReactNode;
}

interface LayerProps {
  id: string;
  type: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

/** The props the fake map, sources and layers last rendered with; sources and layers by id. */
export const rendered = {
  map: undefined as MapProps | undefined,
  sources: new Map<string, SourceProps>(),
  layers: new Map<string, LayerProps>(),
};

/** Stand-in for react-map-gl's map: records its props and renders its children. */
function FakeMap(props: MapProps) {
  rendered.map = props;
  return <div data-testid="map">{props.children}</div>;
}

/** Stand-in for react-map-gl's Source: records its props and wraps its layers, so tests can check which source a layer is in. */
function FakeSource(props: SourceProps) {
  rendered.sources.set(props.id, props);
  return <div data-testid={`source-${props.id}`}>{props.children}</div>;
}

/** Stand-in for react-map-gl's Layer: records its props. */
function FakeLayer(props: LayerProps) {
  rendered.layers.set(props.id, props);
  return <div data-testid={`layer-${props.id}`} />;
}

/** Clicks the fake map at a location, passing the event the way MapLibre would. */
export function clickMap(latitude: number, longitude: number) {
  const onClick = rendered.map?.onClick;
  if (!onClick) throw new Error('No map with a click handler is rendered');
  act(() => onClick({ lngLat: { lat: latitude, lng: longitude } }));
}

/** The camera moves the fake map was asked to make: `flyTo` options, and `fitBounds` bounds with their options. */
export const camera = { flyTo: [] as unknown[], fitBounds: [] as { bounds: unknown; options: unknown }[] };

const fakeMapRef = {
  flyTo: (options: unknown) => camera.flyTo.push(options),
  fitBounds: (bounds: unknown, options: unknown) => camera.fitBounds.push({ bounds, options }),
  getContainer: () => ({ clientHeight: 800 }),
};

/** Stand-in for react-map-gl's useMap: always returns the one fake map. */
const useMap = () => ({ current: fakeMapRef });

mock.module('react-map-gl/maplibre', () => ({ default: FakeMap, Source: FakeSource, Layer: FakeLayer, useMap }));

afterEach(() => {
  rendered.map = undefined;
  rendered.sources.clear();
  rendered.layers.clear();
  camera.flyTo.length = 0;
  camera.fitBounds.length = 0;
});
