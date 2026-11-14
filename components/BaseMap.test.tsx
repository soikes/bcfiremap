import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, mock } from 'bun:test';
import { BASEMAP_STYLE, INITIAL_VIEW } from '../constants/map';
import { clickMap, rendered } from '../test/fakeMapLibre';
import { BaseMap } from './BaseMap';

describe('BaseMap', () => {
  it('starts centred on BC with the OSM Bright basemap', () => {
    render(<BaseMap onClick={mock()} />);
    expect(rendered.map?.initialViewState).toEqual(INITIAL_VIEW);
    expect(rendered.map?.mapStyle).toBe(BASEMAP_STYLE);
  });

  it('fills its container', () => {
    render(<BaseMap onClick={mock()} />);
    expect(rendered.map?.style).toEqual({ width: '100%', height: '100%' });
  });

  it('draws its children inside the map', () => {
    render(
      <BaseMap onClick={mock()}>
        <p>a layer</p>
      </BaseMap>,
    );
    expect(within(screen.getByTestId('map')).getByText('a layer')).toBeInTheDocument();
  });

  it('reports a click as a latitude and longitude', () => {
    const onClick = mock();
    render(<BaseMap onClick={onClick} />);

    clickMap(50.67, -120.33);

    expect(onClick).toHaveBeenCalledWith({ latitude: 50.67, longitude: -120.33 });
  });

  it('reports every click, so tapping somewhere else moves the selection', () => {
    const onClick = mock();
    render(<BaseMap onClick={onClick} />);

    clickMap(50.67, -120.33);
    clickMap(49.89, -119.5);

    expect(onClick.mock.calls).toEqual([
      [{ latitude: 50.67, longitude: -120.33 }],
      [{ latitude: 49.89, longitude: -119.5 }],
    ]);
  });
});
