import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, mock } from 'bun:test';
import { makeBan, makeInactiveBan, makeSource } from '../test/fixtures';
import { SourceStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { BanPanel, BanPanelFallback } from './BanPanel';

const ok = makeSource();

const renderPanel = (bans: FireBan[], sources: SourceStatus[]) =>
  render(<BanPanel bans={bans} sources={sources} onClose={mock()} />);

describe('BanPanel title', () => {
  it('says no bans were found when every source loaded and nothing matched', () => {
    renderPanel([], [ok]);
    expect(screen.getByText('No fire bans found at this location')).toBeInTheDocument();
  });

  it('uses the singular for one ban', () => {
    renderPanel([makeBan()], [ok]);
    expect(screen.getByText('1 fire ban in effect')).toBeInTheDocument();
  });

  it('counts only active bans in the title and still lists inactive ones', () => {
    renderPanel([makeBan({ id: 'a', region: 'Active Place' }), makeInactiveBan({ id: 'b', region: 'Dormant Place' })], [ok]);
    expect(screen.getByText('1 fire ban in effect')).toBeInTheDocument();
    expect(screen.getByText('Dormant Place')).toBeInTheDocument();
  });

  it('says no bans are in effect when every ban found is inactive', () => {
    renderPanel([makeInactiveBan()], [ok]);
    expect(screen.getByText('No fire bans in effect right now')).toBeInTheDocument();
  });

  it('uses the plural and lists every ban for several', () => {
    renderPanel([makeBan({ id: 'a', region: 'Region A' }), makeBan({ id: 'b', region: 'Region B' })], [ok]);

    expect(screen.getByText('2 fire bans in effect')).toBeInTheDocument();
    expect(screen.getByText('Region A')).toBeInTheDocument();
    expect(screen.getByText('Region B')).toBeInTheDocument();
  });

  it('says data is loading while a source has not answered yet', () => {
    renderPanel([], [makeSource({ status: 'pending', hasData: false })]);
    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
    expect(screen.queryByText('No fire bans found at this location')).not.toBeInTheDocument();
  });

  it('says no bans were found only in the sources that loaded when a source failed', () => {
    renderPanel([], [ok, makeSource({ id: 'down', status: 'error', hasData: false })]);
    expect(screen.getByText('No fire bans found in the sources that loaded')).toBeInTheDocument();
    expect(screen.queryByText('No fire bans found at this location')).not.toBeInTheDocument();
  });

  it('says data is loading while one source loads and another has failed', () => {
    renderPanel([], [makeSource({ id: 'slow', status: 'pending', hasData: false }), makeSource({ id: 'down', status: 'error', hasData: false })]);
    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
  });

  it('counts the bans found even when every other source failed', () => {
    renderPanel([makeBan()], [makeSource({ id: 'down', status: 'error', hasData: false })]);
    expect(screen.getByText('1 fire ban in effect')).toBeInTheDocument();
  });
});

describe('BanPanel failure warning', () => {
  const warning = "⚠ Some sources couldn't be checked, so bans may be missing.";

  it('warns that bans may be missing when a source failed, even if bans were found', () => {
    renderPanel([makeBan()], [ok, makeSource({ id: 'down', status: 'error', hasData: false })]);
    expect(screen.getByText('1 fire ban in effect')).toBeInTheDocument();
    expect(screen.getByText(warning)).toBeInTheDocument();
  });

  it('warns when no bans were found and a source failed', () => {
    renderPanel([], [makeSource({ status: 'error', hasData: false })]);
    expect(screen.getByText(warning)).toBeInTheDocument();
  });

  it('does not warn when every source loaded', () => {
    renderPanel([makeBan()], [ok]);
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });

  it('does not warn when a refresh failed but older data is still shown', () => {
    renderPanel([makeBan()], [makeSource({ status: 'error', hasData: true })]);
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });

  it('does not warn while sources are still loading', () => {
    renderPanel([], [makeSource({ status: 'pending', hasData: false })]);
    expect(screen.queryByText(warning)).not.toBeInTheDocument();
  });
});

describe('BanPanelFallback', () => {
  it('asks the user to tap the map again', () => {
    render(<BanPanelFallback />);
    expect(screen.getByText("⚠ Couldn't show the bans for this location. Tap the map to try again.")).toBeInTheDocument();
  });
});

describe('BanPanel sources', () => {
  it('shows the source of each ban, what it covers and its attribution', () => {
    const source = makeSource({
      name: 'BC Wildfire Service',
      coverage: 'Provincial orders only.',
      attribution: 'Licensed under the Open Government Licence – British Columbia.',
    });
    renderPanel([makeBan({ source: source.id })], [source]);

    expect(screen.getByText(/BC Wildfire Service: updated/)).toBeInTheDocument();
    expect(screen.getByText('Provincial orders only.')).toBeInTheDocument();
    expect(screen.getByText('Licensed under the Open Government Licence – British Columbia.')).toBeInTheDocument();
  });

  it('hides healthy sources that supplied none of the bans shown, with their coverage and attribution', () => {
    const used = makeSource({ id: 'used', name: 'Used Source' });
    const unused = makeSource({ id: 'unused', name: 'Unused Source', coverage: 'Unused coverage.', attribution: 'Unused credit.' });
    renderPanel([makeBan({ source: 'used' })], [used, unused]);

    expect(screen.getByText(/Used Source: updated/)).toBeInTheDocument();
    expect(screen.queryByText(/Unused Source/)).toBeNull();
    expect(screen.queryByText('Unused coverage.')).toBeNull();
    expect(screen.queryByText('Unused credit.')).toBeNull();
  });

  it('still shows a source that failed even though it supplied no bans here', () => {
    renderPanel([], [makeSource({ id: 'down', name: 'Down Source', status: 'error', hasData: false })]);
    expect(screen.getByText('Down Source: unavailable')).toBeInTheDocument();
  });

  it('shows stale data with a warning when a refresh failed', () => {
    renderPanel([makeBan()], [makeSource({ name: 'BC Wildfire Service', status: 'error', hasData: true })]);

    expect(screen.getByText('1 fire ban in effect')).toBeInTheDocument();
    expect(screen.getByText(/BC Wildfire Service: update failed, showing data from/)).toBeInTheDocument();
  });

  it('says a source with no data is being retried', () => {
    renderPanel([], [makeSource({ name: 'BC Wildfire Service', status: 'pending', hasData: false, retrying: true })]);
    expect(screen.getByText("BC Wildfire Service: couldn't load, retrying…")).toBeInTheDocument();
    expect(screen.getByText('Loading ban data…')).toBeInTheDocument();
  });

  it('says a refresh is being retried while older data is shown', () => {
    renderPanel([makeBan()], [makeSource({ name: 'BC Wildfire Service', retrying: true })]);
    expect(screen.getByText(/BC Wildfire Service: update failed, retrying… \(showing data from/)).toBeInTheDocument();
  });

  it('shows a source with no data as unavailable', () => {
    renderPanel([], [makeSource({ name: 'BC Wildfire Service', status: 'error', hasData: false })]);
    expect(screen.getByText('BC Wildfire Service: unavailable')).toBeInTheDocument();
  });
});

describe('BanPanel close button', () => {
  it('calls onClose when clicked', async () => {
    const onClose = mock();
    const user = userEvent.setup();
    render(<BanPanel bans={[makeBan()]} sources={[ok]} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
