import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { levelColor } from '../constants/banStyle';
import { makeBan } from '../test/fixtures';
import { rendered } from '../test/fakeMapLibre';
import { bansToFeatureCollection } from '../utils/geometry';
import { BanPolygons } from './BanPolygons';

describe('BanPolygons', () => {
  it('draws every ban as a feature of one GeoJSON source', () => {
    const bans = [makeBan({ id: 'a' }), makeBan({ id: 'b', level: 'municipal' })];
    render(<BanPolygons bans={bans} />);
    expect(rendered.sources.get('bans')).toMatchObject({ type: 'geojson', data: bansToFeatureCollection(bans) });
  });

  it('draws a fill layer and an outline layer from that source', () => {
    render(<BanPolygons bans={[makeBan()]} />);
    const source = screen.getByTestId('source-bans');
    expect(within(source).getByTestId('layer-ban-fill')).toBeInTheDocument();
    expect(within(source).getByTestId('layer-ban-outline')).toBeInTheDocument();
  });

  it('colours the fill and the outline by ban level', () => {
    render(<BanPolygons bans={[makeBan()]} />);
    expect(rendered.layers.get('ban-fill')).toMatchObject({ type: 'fill', paint: { 'fill-color': levelColor('fill') } });
    expect(rendered.layers.get('ban-outline')).toMatchObject({
      type: 'line',
      paint: { 'line-color': levelColor('stroke'), 'line-width': 2 },
    });
  });

  it('draws an empty source when there are no bans', () => {
    render(<BanPolygons bans={[]} />);
    expect(rendered.sources.get('bans')?.data).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('keeps the same GeoJSON while the bans are unchanged, and rebuilds it when they change', () => {
    const bans = [makeBan()];
    const { rerender } = render(<BanPolygons bans={bans} />);
    const first = rendered.sources.get('bans')?.data;

    rerender(<BanPolygons bans={bans} />);
    expect(rendered.sources.get('bans')?.data).toBe(first);

    rerender(<BanPolygons bans={[makeBan({ id: 'other' })]} />);
    expect(rendered.sources.get('bans')?.data).not.toBe(first);
  });
});
