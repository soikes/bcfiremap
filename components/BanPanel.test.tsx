import { render, screen, userEvent } from '@testing-library/react-native';
import { makeBan } from '../test/fixtures';
import { BanPanel } from './BanPanel';

describe('BanPanel', () => {
  it('says there are no bans when the list is empty', async () => {
    await render(<BanPanel bans={[]} onClose={jest.fn()} />);
    expect(screen.getByText('No fire bans at this location')).toBeOnTheScreen();
  });

  it('uses the singular for one ban', async () => {
    await render(<BanPanel bans={[makeBan()]} onClose={jest.fn()} />);
    expect(screen.getByText('1 fire ban in effect')).toBeOnTheScreen();
  });

  it('uses the plural and lists every ban for several', async () => {
    const bans = [
      makeBan({ id: 'a', region: 'Region A' }),
      makeBan({ id: 'b', region: 'Region B' }),
    ];
    await render(<BanPanel bans={bans} onClose={jest.fn()} />);

    expect(screen.getByText('2 fire bans in effect')).toBeOnTheScreen();
    expect(screen.getByText('Region A')).toBeOnTheScreen();
    expect(screen.getByText('Region B')).toBeOnTheScreen();
  });

  it('calls onClose when the close button is pressed', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<BanPanel bans={[makeBan()]} onClose={onClose} />);

    await user.press(screen.getByText('✕'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
