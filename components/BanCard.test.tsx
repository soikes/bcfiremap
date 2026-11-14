import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { makeBan } from '../test/fixtures';
import { BanCard } from './BanCard';

describe('BanCard', () => {
  it('shows the level, region, source title, description and effective date', () => {
    render(
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

    expect(screen.getByText('Regional District')).toBeInTheDocument();
    expect(screen.getByText('Thompson-Nicola Regional District')).toBeInTheDocument();
    expect(screen.getByText('Campfire · Category 1')).toBeInTheDocument();
    expect(screen.getByText('Campfires are prohibited.')).toBeInTheDocument();
    expect(screen.getByText('Effective 2026-06-15')).toBeInTheDocument();
  });

  it('falls back to the type label when the source gave no title', () => {
    render(<BanCard ban={makeBan({ title: undefined, type: 'open-burning' })} />);
    expect(screen.getByText('Open Burning Prohibition')).toBeInTheDocument();
  });

  it('leaves out the description, date and link when the source gave none', () => {
    render(<BanCard ban={makeBan({ description: '', effectiveDate: undefined, url: undefined })} />);
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
