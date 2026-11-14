import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { makeSource } from '../test/fixtures';
import { SourceBanner } from './SourceBanner';

describe('SourceBanner', () => {
  it('shows nothing when every source loaded', () => {
    render(<SourceBanner sources={[makeSource()]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows nothing while sources are still loading', () => {
    render(<SourceBanner sources={[makeSource({ status: 'pending', hasData: false })]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows nothing when a refresh failed but older data is still on the map', () => {
    render(<SourceBanner sources={[makeSource({ status: 'error', hasData: true })]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows nothing when there are no sources yet', () => {
    render(<SourceBanner sources={[]} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('names the source that failed and warns that bans may be missing', () => {
    render(<SourceBanner sources={[makeSource({ name: 'BC Wildfire Service', status: 'error', hasData: false })]} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      "Couldn't load BC Wildfire Service. Bans may be missing from the map.",
    );
  });

  it('names every failed source and leaves out the ones that loaded', () => {
    render(
      <SourceBanner
        sources={[
          makeSource({ id: 'a', name: 'Source A', status: 'error', hasData: false }),
          makeSource({ id: 'b', name: 'Source B' }),
          makeSource({ id: 'c', name: 'Source C', status: 'error', hasData: false }),
        ]}
      />,
    );
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent("Couldn't load Source A and Source C.");
    expect(banner).not.toHaveTextContent('Source B');
  });
});
