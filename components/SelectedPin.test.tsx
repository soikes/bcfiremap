import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { rendered } from '../test/fakeMapLibre';
import { SelectedPin } from './SelectedPin';

const KAMLOOPS = { latitude: 50.67, longitude: -120.33 };

describe('SelectedPin', () => {
  it('places a single point at the tapped location, as [longitude, latitude]', () => {
    render(<SelectedPin coordinate={KAMLOOPS} />);
    expect(rendered.sources.get('selected-pin')).toMatchObject({
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [-120.33, 50.67] } }],
      },
    });
  });

  it('draws the point as a circle layer from that source', () => {
    render(<SelectedPin coordinate={KAMLOOPS} />);
    expect(within(screen.getByTestId('source-selected-pin')).getByTestId('layer-selected-pin-dot')).toBeInTheDocument();
    expect(rendered.layers.get('selected-pin-dot')?.type).toBe('circle');
  });

  it('keeps the same point data while the location is unchanged, and moves it when it changes', () => {
    const { rerender } = render(<SelectedPin coordinate={KAMLOOPS} />);
    const first = rendered.sources.get('selected-pin')?.data;

    rerender(<SelectedPin coordinate={KAMLOOPS} />);
    expect(rendered.sources.get('selected-pin')?.data).toBe(first);

    rerender(<SelectedPin coordinate={{ latitude: 49.89, longitude: -119.5 }} />);
    const moved = rendered.sources.get('selected-pin')?.data as { features: { geometry: { coordinates: number[] } }[] };
    expect(moved).not.toBe(first);
    expect(moved.features[0].geometry.coordinates).toEqual([-119.5, 49.89]);
  });
});
