import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { makeSource } from '../test/fixtures';
import { SourceStatus } from '../types/api';
import { SourceBanner } from './SourceBanner';

/** The banner's rows as text, in order. */
const rows = () => [...screen.getByRole('status').querySelectorAll('li')].map(row => row.textContent);

/** The banner's row for a source name. */
const rowFor = (name: string) => [...screen.getByRole('status').querySelectorAll('li')].find(row => row.textContent?.includes(name));

const loading = (name: string) => makeSource({ id: name, name, status: 'pending', hasData: false, fetching: true });
const retrying = (name: string) => makeSource({ id: name, name, status: 'pending', hasData: false, fetching: true, retrying: true });
const failed = (name: string) => makeSource({ id: name, name, status: 'error', hasData: false });
const loaded = (name: string) => makeSource({ id: name, name });

const renderBanner = (sources: SourceStatus[]) => render(<SourceBanner sources={sources} />);

describe('SourceBanner when nothing needs saying', () => {
  it('shows nothing when every source loaded', () => {
    renderBanner([loaded('A')]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows nothing when there are no sources yet', () => {
    renderBanner([]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows nothing when a refresh failed but older data is still on the map', () => {
    renderBanner([makeSource({ status: 'error', hasData: true })]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('SourceBanner rows', () => {
  it('gives a loading source a quiet row with a spinner', () => {
    renderBanner([loading('BC Wildfire Service')]);
    expect(rows()).toEqual(['Loading ban data from BC Wildfire Service…']);
    const row = rowFor('BC Wildfire Service');
    expect(row).toHaveClass('source-banner-loading');
    expect(row?.querySelector('.source-banner-spinner')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a source refreshing data it already has as loading', () => {
    renderBanner([makeSource({ name: 'BC Wildfire Service', fetching: true })]);
    expect(rows()).toEqual(['Loading ban data from BC Wildfire Service…']);
  });

  it('gives a source being retried a warning row with a spinner', () => {
    renderBanner([retrying('BC Wildfire Service')]);
    expect(rows()).toEqual(["Couldn't load ban data from BC Wildfire Service. Retrying…"]);
    expect(rowFor('BC Wildfire Service')).toHaveClass('source-banner-retrying');
    expect(rowFor('BC Wildfire Service')?.querySelector('.source-banner-spinner')).toBeInTheDocument();
  });

  it('shows a refresh being retried while older data is still on the map', () => {
    renderBanner([makeSource({ name: 'BC Wildfire Service', fetching: true, retrying: true })]);
    expect(rows()).toEqual(["Couldn't load ban data from BC Wildfire Service. Retrying…"]);
  });

  it('gives a source that failed once retries ran out a warning row without a spinner', () => {
    renderBanner([failed('BC Wildfire Service')]);
    expect(rows()).toEqual(["⚠ Couldn't load BC Wildfire Service. Bans may be missing from the map."]);
    expect(rowFor('BC Wildfire Service')).toHaveClass('source-banner-failed');
    expect(rowFor('BC Wildfire Service')?.querySelector('.source-banner-spinner')).not.toBeInTheDocument();
  });

  it('shows a failed source that tries again as loading', () => {
    renderBanner([makeSource({ name: 'A', status: 'error', hasData: false, fetching: true })]);
    expect(rows()).toEqual(['Loading ban data from A…']);
  });
});

describe('SourceBanner with several sources', () => {
  it('gives each source its own row, in source order, and leaves out the loaded ones', () => {
    renderBanner([loading('A'), failed('B'), loaded('C'), retrying('D'), loading('E')]);
    expect(rows()).toEqual([
      'Loading ban data from A…',
      "⚠ Couldn't load B. Bans may be missing from the map.",
      "Couldn't load ban data from D. Retrying…",
      'Loading ban data from E…',
    ]);
  });

  it('removes a row once its source has loaded and keeps the others', () => {
    const { rerender } = renderBanner([loading('A'), loading('B')]);
    expect(rows()).toEqual(['Loading ban data from A…', 'Loading ban data from B…']);

    rerender(<SourceBanner sources={[loaded('A'), loading('B')]} />);

    expect(rows()).toEqual(['Loading ban data from B…']);
  });

  it('updates a row in place as its source goes from loading to retrying to failed', () => {
    const { rerender } = renderBanner([loading('A'), loading('B')]);

    rerender(<SourceBanner sources={[retrying('A'), loading('B')]} />);
    expect(rows()).toEqual(["Couldn't load ban data from A. Retrying…", 'Loading ban data from B…']);

    rerender(<SourceBanner sources={[failed('A'), loaded('B')]} />);
    expect(rows()).toEqual(["⚠ Couldn't load A. Bans may be missing from the map."]);
  });

  it('keeps each row as its own list item', () => {
    renderBanner([loading('A'), loading('B'), loading('C')]);
    expect(screen.getByRole('status').tagName).toBe('UL');
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(3);
  });
});
