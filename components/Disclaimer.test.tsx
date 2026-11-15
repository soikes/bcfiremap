import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { Disclaimer } from './Disclaimer';

/** Gives an element a fixed bounding box top and bottom. */
function placeAt(element: Element, top: number, bottom: number) {
  element.getBoundingClientRect = () => ({ top, bottom }) as DOMRect;
}

/** Renders the notice next to a stand-in for MapLibre's attribution with the given classes. */
function renderWithAttribution(classes: string) {
  const { container } = render(
    <div data-testid="map">
      <Disclaimer />
      <details className={`maplibregl-ctrl-attrib ${classes}`} />
    </div>,
  );
  placeAt(screen.getByTestId('map'), 0, 800);
  const attribution = container.querySelector('.maplibregl-ctrl-attrib')!;
  placeAt(attribution, 740, 790);
  return { attribution, notice: screen.getByText(/work in progress/i) };
}

describe('Disclaimer', () => {
  it('says the map is a work in progress for information only and to check with the municipality or fire department', () => {
    render(<Disclaimer />);
    const notice = screen.getByText(/work in progress/i);
    expect(notice).toHaveTextContent(/for informational purposes only/);
    expect(notice).toHaveTextContent(/municipality or local fire department/);
  });

  it('sits at the bottom beside the attribution button while the attribution is collapsed', () => {
    const { notice } = renderWithAttribution('maplibregl-compact');
    expect(notice).toHaveClass('disclaimer-beside-button');
    expect(notice).toHaveStyle({ bottom: '10px' });
  });

  it('moves above the attribution when it opens and back down when it closes', async () => {
    const { attribution, notice } = renderWithAttribution('maplibregl-compact');
    await act(async () => attribution.classList.add('maplibregl-compact-show'));
    expect(notice).not.toHaveClass('disclaimer-beside-button');
    expect(notice).toHaveStyle({ bottom: '68px' });
    await act(async () => attribution.classList.remove('maplibregl-compact-show'));
    expect(notice).toHaveStyle({ bottom: '10px' });
  });
});
