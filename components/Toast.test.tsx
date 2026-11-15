import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { Toast } from './Toast';

describe('Toast', () => {
  it('shows its message as a status for screen readers', () => {
    render(<Toast message="Something went wrong" />);
    expect(screen.getByRole('status')).toHaveTextContent('Something went wrong');
  });
});
