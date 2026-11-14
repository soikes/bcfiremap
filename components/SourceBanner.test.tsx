import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { makeSource } from '../test/fixtures';
import { SourceBanner } from './SourceBanner';

/** The banner's lines, as text. */
const lines = () => [...screen.getByRole('status').querySelectorAll('p')].map(line => line.textContent);

const loading = (name: string) => makeSource({ id: name, name, status: 'pending', hasData: false, fetching: true });
const retrying = (name: string) => makeSource({ id: name, name, status: 'pending', hasData: false, fetching: true, retrying: true });
const failed = (name: string) => makeSource({ id: name, name, status: 'error', hasData: false });

describe('SourceBanner when nothing needs saying', () => {
  it('shows nothing when every source loaded', () => {
    render(<SourceBanner sources={[makeSource()]} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows nothing when there are no sources yet', () => {
    render(<SourceBanner sources={[]} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows nothing when a refresh failed but older data is still on the map', () => {
    render(<SourceBanner sources={[makeSource({ status: 'error', hasData: true })]} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('SourceBanner while loading', () => {
  it('names the source whose first load is in flight, with a spinner', () => {
    const { container } = render(<SourceBanner sources={[loading('BC Wildfire Service')]} />);
    expect(lines()).toEqual(['Loading ban data from BC Wildfire Service…']);
    expect(container.querySelector('.source-banner-spinner')).toHaveAttribute('aria-hidden', 'true');
  });

  it('names a source refreshing data it already has', () => {
    render(<SourceBanner sources={[makeSource({ name: 'BC Wildfire Service', fetching: true })]} />);
    expect(lines()).toEqual(['Loading ban data from BC Wildfire Service…']);
  });

  it('lists every source in flight and leaves out the idle ones', () => {
    render(<SourceBanner sources={[loading('A'), makeSource({ id: 'b', name: 'B' }), loading('C'), loading('D')]} />);
    expect(lines()).toEqual(['Loading ban data from A, C and D…']);
  });

  it('stays quiet rather than looking like a warning', () => {
    render(<SourceBanner sources={[loading('A')]} />);
    expect(screen.getByRole('status')).not.toHaveClass('source-banner-warning');
  });
});

describe('SourceBanner when a source fails', () => {
  it('says a source is being retried, with a spinner, as a warning', () => {
    const { container } = render(<SourceBanner sources={[retrying('BC Wildfire Service')]} />);
    expect(lines()).toEqual(["Couldn't load ban data from BC Wildfire Service. Retrying…"]);
    expect(container.querySelector('.source-banner-spinner')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('source-banner-warning');
  });

  it('says it is retrying when a refresh failed while older data is still on the map', () => {
    render(<SourceBanner sources={[makeSource({ name: 'BC Wildfire Service', fetching: true, retrying: true })]} />);
    expect(lines()).toEqual(["Couldn't load ban data from BC Wildfire Service. Retrying…"]);
  });

  it('says bans may be missing once the retries run out, without a spinner', () => {
    const { container } = render(<SourceBanner sources={[failed('BC Wildfire Service')]} />);
    expect(lines()).toEqual(["⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map."]);
    expect(container.querySelector('.source-banner-spinner')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('source-banner-warning');
  });

  it('names every failed source', () => {
    render(<SourceBanner sources={[failed('A'), failed('B'), failed('C')]} />);
    expect(lines()).toEqual(["⚠ Couldn't load A, B and C. Bans may be missing from the map."]);
  });

  it('moves a failed source back to loading when it tries again', () => {
    render(<SourceBanner sources={[makeSource({ name: 'A', status: 'error', hasData: false, fetching: true })]} />);
    expect(lines()).toEqual(['Loading ban data from A…']);
  });
});

describe('SourceBanner with sources in different states', () => {
  it('shows one line per state, most serious first, with each source in one line only', () => {
    render(<SourceBanner sources={[loading('A'), failed('B'), retrying('C'), makeSource({ id: 'd', name: 'D' }), loading('E')]} />);
    expect(lines()).toEqual([
      "⚠ Couldn't load B. Bans may be missing from the map.",
      "Couldn't load ban data from C. Retrying…",
      'Loading ban data from A and E…',
    ]);
  });

  it('turns into a warning as soon as one source has failed', () => {
    render(<SourceBanner sources={[loading('A'), failed('B')]} />);
    expect(screen.getByRole('status')).toHaveClass('source-banner-warning');
  });
});
