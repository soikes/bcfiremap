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

  it('says it is retrying while a source that failed is being tried again', () => {
    render(<SourceBanner sources={[makeSource({ name: 'BC Wildfire Service', status: 'pending', hasData: false, retrying: true })]} />);
    expect(screen.getByRole('alert')).toHaveTextContent("⚠ Couldn't load ban data from BC Wildfire Service. Retrying…");
    expect(screen.getByRole('alert')).not.toHaveTextContent('may be missing');
  });

  it('says it is retrying when a refresh failed while older data is still on the map', () => {
    render(<SourceBanner sources={[makeSource({ name: 'BC Wildfire Service', retrying: true })]} />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load ban data from BC Wildfire Service. Retrying…");
  });

  it('lists a failed source that is being retried only once, as retrying', () => {
    render(
      <SourceBanner sources={[makeSource({ name: 'Source A', status: 'error', hasData: false, retrying: true })]} />,
    );
    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent("Couldn't load ban data from Source A. Retrying…");
    expect(banner).not.toHaveTextContent('may be missing');
  });

  it('shows both messages when one source is retrying and another has given up', () => {
    render(
      <SourceBanner
        sources={[
          makeSource({ id: 'a', name: 'Source A', status: 'pending', hasData: false, retrying: true }),
          makeSource({ id: 'b', name: 'Source B', status: 'error', hasData: false }),
        ]}
      />,
    );
    const lines = screen.getByRole('alert').querySelectorAll('p');
    expect([...lines].map(line => line.textContent)).toEqual([
      "⚠ Couldn't load ban data from Source A. Retrying…",
      "⚠ Couldn't load Source B. Bans may be missing from the map.",
    ]);
  });

  it('lists three or more failed sources with commas and a final "and"', () => {
    render(
      <SourceBanner
        sources={['A', 'B', 'C'].map(name => makeSource({ id: name, name: `Source ${name}`, status: 'error', hasData: false }))}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load Source A, Source B and Source C.");
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
