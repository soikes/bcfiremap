import { render } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { camera } from '../test/fakeMapLibre';
import { makeBan } from '../test/fixtures';
import { MapFocus } from './MapFocus';

const HERE = { latitude: 49.5, longitude: -119.5 };
/** Covers -120..-119 by 49..50, which contains HERE. */
const ban = makeBan();

describe('MapFocus', () => {
  it('does nothing without a target', () => {
    render(<MapFocus target={null} bans={[ban]} />);
    expect(camera.flyTo).toEqual([]);
    expect(camera.fitBounds).toEqual([]);
  });

  it('flies to the point when no ban covers it', () => {
    render(<MapFocus target={HERE} bans={[]} />);
    expect(camera.flyTo).toEqual([{ center: [-119.5, 49.5], zoom: 12 }]);
    expect(camera.fitBounds).toEqual([]);
  });

  it('fits the view to the bans covering the point, leaving room for the panel', () => {
    render(<MapFocus target={HERE} bans={[ban]} />);
    expect(camera.flyTo).toEqual([]);
    expect(camera.fitBounds).toEqual([
      {
        bounds: [[-120, 49], [-119, 50]],
        options: { padding: { top: 70, left: 30, right: 30, bottom: 440 }, maxZoom: 12 },
      },
    ]);
  });

  it('moves again for a new target object at the same place', () => {
    const { rerender } = render(<MapFocus target={HERE} bans={[ban]} />);
    rerender(<MapFocus target={{ ...HERE }} bans={[ban]} />);
    expect(camera.fitBounds).toHaveLength(2);
  });

  it('does not move again when only the bans change', () => {
    const { rerender } = render(<MapFocus target={HERE} bans={[]} />);
    rerender(<MapFocus target={HERE} bans={[ban]} />);
    expect(camera.flyTo).toHaveLength(1);
    expect(camera.fitBounds).toEqual([]);
  });
});
