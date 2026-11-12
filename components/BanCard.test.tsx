import { render, screen } from '@testing-library/react-native';
import { makeBan } from '../test/fixtures';
import { BanCard } from './BanCard';

describe('BanCard', () => {
  it('shows the level, region, type, description and effective date', async () => {
    await render(
      <BanCard
        ban={makeBan({
          level: 'regional-district',
          region: 'Thompson-Nicola Regional District',
          type: 'open-burning',
          description: 'Open burning is prohibited.',
          effectiveDate: '2026-06-15',
        })}
      />,
    );

    expect(screen.getByText('Regional District')).toBeOnTheScreen();
    expect(screen.getByText('Thompson-Nicola Regional District')).toBeOnTheScreen();
    expect(screen.getByText('Open Burning Prohibition')).toBeOnTheScreen();
    expect(screen.getByText('Open burning is prohibited.')).toBeOnTheScreen();
    expect(screen.getByText('Effective 2026-06-15')).toBeOnTheScreen();
  });
});
