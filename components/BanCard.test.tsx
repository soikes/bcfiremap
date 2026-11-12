import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { makeBan } from '../test/fixtures';
import { BanCard } from './BanCard';

describe('BanCard', () => {
  it('shows the level, region, source title, description and effective date', async () => {
    await render(
      <BanCard
        ban={makeBan({
          level: 'regional-district',
          region: 'Thompson-Nicola Regional District',
          title: 'Campfire · Category 1',
          description: 'Campfires are prohibited.',
          effectiveDate: '2026-06-15',
        })}
      />,
    );

    expect(screen.getByText('Regional District')).toBeOnTheScreen();
    expect(screen.getByText('Thompson-Nicola Regional District')).toBeOnTheScreen();
    expect(screen.getByText('Campfire · Category 1')).toBeOnTheScreen();
    expect(screen.getByText('Campfires are prohibited.')).toBeOnTheScreen();
    expect(screen.getByText('Effective 2026-06-15')).toBeOnTheScreen();
  });

  it('falls back to the type label when the source gave no title', async () => {
    await render(<BanCard ban={makeBan({ title: undefined, type: 'open-burning' })} />);
    expect(screen.getByText('Open Burning Prohibition')).toBeOnTheScreen();
  });

  it('leaves out the description, date and link when the source gave none', async () => {
    await render(
      <BanCard ban={makeBan({ description: '', effectiveDate: undefined, url: undefined })} />,
    );
    expect(screen.queryByText(/Effective/)).not.toBeOnTheScreen();
    expect(screen.queryByText('Official bulletin')).not.toBeOnTheScreen();
  });

  it('opens the bulletin link when pressed', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<BanCard ban={makeBan({ url: 'https://example.gov/bulletin' })} />);

    await user.press(screen.getByText('Official bulletin'));

    expect(openURL).toHaveBeenCalledWith('https://example.gov/bulletin');
    openURL.mockRestore();
  });
});
