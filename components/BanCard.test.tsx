import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { PERMISSION_STYLE } from '../constants/banStyle';
import { makeBan } from '../test/fixtures';
import { BanCard } from './BanCard';

describe('BanCard', () => {
  it('shows the level, region, activity, description and effective date', () => {
    render(
      <BanCard
        ban={makeBan({
          level: 'regional-district',
          region: 'Thompson-Nicola Regional District',
          activity: 'campfire',
          description: 'Campfires are prohibited.',
          otherwise: 'allowed',
          periods: [{ permission: 'prohibited', from: '2026-06-15' }],
        })}
      />,
    );

    expect(screen.getByText('Regional District')).toBeInTheDocument();
    expect(screen.getByText('Thompson-Nicola Regional District')).toBeInTheDocument();
    expect(screen.getByText('Campfires:')).toBeInTheDocument();
    expect(screen.getByText('Campfires are prohibited.')).toBeInTheDocument();
    expect(screen.getByText('Effective 2026-06-15')).toBeInTheDocument();
  });

  it('names the activity from its type, and uses the source wording for other', () => {
    const { rerender } = render(<BanCard ban={makeBan({ activity: 'beach-fire' })} />);
    expect(screen.getByText('Beach fires:')).toBeInTheDocument();
    rerender(<BanCard ban={makeBan({ activity: 'other', title: 'Fireworks' })} />);
    expect(screen.getByText('Fireworks:')).toBeInTheDocument();
    rerender(<BanCard ban={makeBan({ activity: 'other', title: undefined })} />);
    expect(screen.getByText('Fires:')).toBeInTheDocument();
  });

  it.each([
    ['prohibited', 'Prohibited', '✕'],
    ['by-permit-only', 'By permit only', '!'],
    ['allowed-with-conditions', 'Allowed with conditions', '✓*'],
    ['allowed', 'Allowed', '✓'],
  ] as const)('says %s with its label and icon, coloured to match', (permission, label, icon) => {
    const { container } = render(<BanCard ban={makeBan({ otherwise: permission })} />);
    const color = PERMISSION_STYLE[permission].solid;
    expect(screen.getByText(new RegExp(`^\\s*${label}$`))).toHaveStyle({ color });
    expect(screen.getByText(icon)).toBeInTheDocument();
    expect(container.querySelector('.ban-card')).toHaveStyle({ borderLeftColor: color });
    expect(screen.getByText('Provincial')).toHaveStyle({ backgroundColor: color });
  });

  it('follows the period that covers today, not just `otherwise`', () => {
    render(<BanCard ban={makeBan({ otherwise: 'allowed', periods: [{ permission: 'by-permit-only' }] })} />);
    expect(screen.getByText(/By permit only/)).toBeInTheDocument();
    expect(screen.queryByText(/Allowed/)).not.toBeInTheDocument();
  });

  it('has no Active or Inactive badge', () => {
    render(<BanCard ban={makeBan()} />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
  });

  it('leaves out the description, date and link when the source gave none', () => {
    render(<BanCard ban={makeBan({ description: '', url: undefined })} />);
    expect(screen.queryByText(/Effective/)).not.toBeInTheDocument();
    expect(screen.queryByText('Official bulletin')).not.toBeInTheDocument();
  });

  it('links to the bulletin in a new tab', () => {
    render(<BanCard ban={makeBan({ url: 'https://example.gov/bulletin' })} />);
    const link = screen.getByRole('link', { name: 'Official bulletin' });
    expect(link).toHaveAttribute('href', 'https://example.gov/bulletin');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
