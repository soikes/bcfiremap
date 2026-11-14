import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, mock } from 'bun:test';
import { makeBan, makeSource } from '../test/fixtures';
import { SourceStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { BanPanel } from './BanPanel';

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

  it('says a source could not be checked rather than claiming there are no bans', () => {
    renderPanel([], [makeSource({ status: 'error', hasData: false })]);
    expect(screen.getByText("Couldn't check every source")).toBeInTheDocument();
    expect(screen.queryByText('No fire bans found at this location')).not.toBeInTheDocument();
  });
});

describe('BanPanel sources', () => {
  it('shows each source, what it covers and its attribution', () => {
    const source = makeSource({
      name: 'BC Wildfire Service',
      coverage: 'Provincial orders only.',
      attribution: 'Licensed under the Open Government Licence – British Columbia.',
    });
    renderPanel([], [source]);

    expect(screen.getByText(/BC Wildfire Service: updated/)).toBeInTheDocument();
    expect(screen.getByText('Provincial orders only.')).toBeInTheDocument();
    expect(screen.getByText('Licensed under the Open Government Licence – British Columbia.')).toBeInTheDocument();
  });

  it('shows stale data with a warning when a refresh failed', () => {
    renderPanel([makeBan()], [makeSource({ name: 'BC Wildfire Service', status: 'error', hasData: true })]);

    expect(screen.getByText('1 fire ban in effect')).toBeInTheDocument();
    expect(screen.getByText(/BC Wildfire Service: update failed, showing data from/)).toBeInTheDocument();
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
