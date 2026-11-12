import { render, screen, userEvent } from '@testing-library/react-native';
import { makeBan, makeSource } from '../test/fixtures';
import { BanPanel } from './BanPanel';

const ok = makeSource();

describe('BanPanel title', () => {
  it('says no bans were found when every source loaded and nothing matched', async () => {
    await render(<BanPanel bans={[]} sources={[ok]} onClose={jest.fn()} />);
    expect(screen.getByText('No fire bans found at this location')).toBeOnTheScreen();
  });

  it('uses the singular for one ban', async () => {
    await render(<BanPanel bans={[makeBan()]} sources={[ok]} onClose={jest.fn()} />);
    expect(screen.getByText('1 fire ban in effect')).toBeOnTheScreen();
  });

  it('uses the plural and lists every ban for several', async () => {
    const bans = [
      makeBan({ id: 'a', region: 'Region A' }),
      makeBan({ id: 'b', region: 'Region B' }),
    ];
    await render(<BanPanel bans={bans} sources={[ok]} onClose={jest.fn()} />);

    expect(screen.getByText('2 fire bans in effect')).toBeOnTheScreen();
    expect(screen.getByText('Region A')).toBeOnTheScreen();
    expect(screen.getByText('Region B')).toBeOnTheScreen();
  });

  it('says data is loading rather than claiming there are no bans', async () => {
    const loading = makeSource({ status: 'pending', hasData: false });
    await render(<BanPanel bans={[]} sources={[loading]} onClose={jest.fn()} />);
    expect(screen.getByText('Loading ban data…')).toBeOnTheScreen();
    expect(screen.queryByText('No fire bans found at this location')).not.toBeOnTheScreen();
  });

  it('says a source could not be checked rather than claiming there are no bans', async () => {
    const failed = makeSource({ status: 'error', hasData: false });
    await render(<BanPanel bans={[]} sources={[failed]} onClose={jest.fn()} />);
    expect(screen.getByText("Couldn't check every source")).toBeOnTheScreen();
    expect(screen.queryByText('No fire bans found at this location')).not.toBeOnTheScreen();
  });
});

describe('BanPanel sources', () => {
  it('shows each source, what it covers and its attribution', async () => {
    const source = makeSource({
      name: 'BC Wildfire Service',
      coverage: 'Provincial orders only.',
      attribution: 'Licensed under the Open Government Licence – British Columbia.',
    });
    await render(<BanPanel bans={[]} sources={[source]} onClose={jest.fn()} />);

    expect(screen.getByText(/BC Wildfire Service: updated/)).toBeOnTheScreen();
    expect(screen.getByText('Provincial orders only.')).toBeOnTheScreen();
    expect(screen.getByText('Licensed under the Open Government Licence – British Columbia.')).toBeOnTheScreen();
  });

  it('shows stale data with a warning when a refresh failed', async () => {
    const stale = makeSource({ name: 'BC Wildfire Service', status: 'error', hasData: true });
    await render(<BanPanel bans={[makeBan()]} sources={[stale]} onClose={jest.fn()} />);

    expect(screen.getByText('1 fire ban in effect')).toBeOnTheScreen();
    expect(screen.getByText(/BC Wildfire Service: update failed, showing data from/)).toBeOnTheScreen();
  });

  it('shows a source with no data as unavailable', async () => {
    const down = makeSource({ name: 'BC Wildfire Service', status: 'error', hasData: false });
    await render(<BanPanel bans={[]} sources={[down]} onClose={jest.fn()} />);
    expect(screen.getByText('BC Wildfire Service: unavailable')).toBeOnTheScreen();
  });
});

describe('BanPanel close button', () => {
  it('calls onClose when pressed', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<BanPanel bans={[makeBan()]} sources={[ok]} onClose={onClose} />);

    await user.press(screen.getByText('✕'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
