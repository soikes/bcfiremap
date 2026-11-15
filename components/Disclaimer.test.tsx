import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { Disclaimer } from './Disclaimer';

describe('Disclaimer', () => {
  it('says the map is a work in progress for information only and to check with the municipality or fire department', () => {
    render(<Disclaimer />);
    const notice = screen.getByText(/work in progress/i);
    expect(notice).toHaveTextContent(/for informational purposes only/);
    expect(notice).toHaveTextContent(/municipality or local fire department/);
  });
});
