import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { FIRE_ZONES_URL, OPENFREEMAP_FONTS } from '../constants/map';
import { rendered } from '../test/fakeMapLibre';
import { FireZones } from './FireZones';

describe('FireZones', () => {
  it('loads the zones from the BC ArcGIS service URL as a GeoJSON source', () => {
    render(<FireZones />);
    expect(rendered.sources.get('fire-zones')).toMatchObject({ type: 'geojson', data: FIRE_ZONES_URL });
  });

  it('draws zone outlines and zone labels from that source', () => {
    render(<FireZones />);
    const source = screen.getByTestId('source-fire-zones');
    expect(within(source).getByTestId('layer-fire-zone-outlines')).toBeInTheDocument();
    expect(within(source).getByTestId('layer-fire-zone-labels')).toBeInTheDocument();
    expect(rendered.layers.get('fire-zone-outlines')?.type).toBe('line');
    expect(rendered.layers.get('fire-zone-labels')?.type).toBe('symbol');
  });

  it('labels each zone with its FIRE_ZONE name', () => {
    render(<FireZones />);
    expect(rendered.layers.get('fire-zone-labels')?.layout?.['text-field']).toEqual(['get', 'FIRE_ZONE']);
  });

  it('only uses label fonts that OpenFreeMap serves', () => {
    render(<FireZones />);
    const fonts = rendered.layers.get('fire-zone-labels')?.layout?.['text-font'] as string[];
    expect(fonts.length).toBeGreaterThan(0);
    fonts.forEach(font => expect(OPENFREEMAP_FONTS).toContain(font));
  });
});
