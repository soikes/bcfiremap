import { cleanup, render, screen } from '@testing-library/react';
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
  it('shows one row, for the most urgent state: failed, then retrying, then loading', () => {
    renderBanner([loading('A'), failed('B'), loaded('C'), retrying('D'), loading('E')]);
    expect(rows()).toEqual(["⚠ Couldn't load B. Bans may be missing from the map."]);

    cleanup();
    renderBanner([loading('A'), loaded('C'), retrying('D'), loading('E')]);
    expect(rows()).toEqual(["Couldn't load ban data from D. Retrying…"]);

    cleanup();
    renderBanner([loading('A'), loaded('C'), loading('E')]);
    expect(rows()).toEqual(['Loading ban data from A and E…']);
  });

  it('names up to two sources and counts more', () => {
    renderBanner([loading('A'), loading('B'), loading('C'), loading('D')]);
    expect(rows()).toEqual(['Loading ban data from 4 sources…']);

    cleanup();
    renderBanner([failed('A'), failed('B'), loaded('C')]);
    expect(rows()).toEqual(["⚠ Couldn't load A and B. Bans may be missing from the map."]);

    cleanup();
    renderBanner([retrying('A'), retrying('B'), retrying('C')]);
    expect(rows()).toEqual(["Couldn't load ban data from 3 sources. Retrying…"]);
  });

  it('only counts the sources in the reported state', () => {
    renderBanner([failed('A'), loading('B'), loading('C'), loading('D')]);
    expect(rows()).toEqual(["⚠ Couldn't load A. Bans may be missing from the map."]);
  });

  it('shrinks and then goes away as sources load', () => {
    const { rerender } = renderBanner([loading('A'), loading('B'), loading('C')]);
    expect(rows()).toEqual(['Loading ban data from 3 sources…']);

    rerender(<SourceBanner sources={[loaded('A'), loading('B'), loading('C')]} />);
    expect(rows()).toEqual(['Loading ban data from B and C…']);

    rerender(<SourceBanner sources={[loaded('A'), loaded('B'), loaded('C')]} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('updates in place as the sources go from loading to retrying to failed', () => {
    const { rerender } = renderBanner([loading('A'), loading('B')]);

    rerender(<SourceBanner sources={[retrying('A'), loading('B')]} />);
    expect(rows()).toEqual(["Couldn't load ban data from A. Retrying…"]);

    rerender(<SourceBanner sources={[failed('A'), loaded('B')]} />);
    expect(rows()).toEqual(["⚠ Couldn't load A. Bans may be missing from the map."]);
  });

  it('never shows more than one row, however many sources are loading', () => {
    renderBanner(Array.from({ length: 15 }, (_, i) => loading(`Source ${i}`)));
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(1);
  });
});
