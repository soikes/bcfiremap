import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { LoadSpinner } from './LoadSpinner';

describe('LoadSpinner', () => {
  it('shows a labelled status with no text while active', () => {
    render(<LoadSpinner active />);
    const spinner = screen.getByRole('status', { name: 'Loading ban data' });
    expect(spinner).toHaveClass('load-spinner');
    expect(spinner).toBeEmptyDOMElement();
  });

  it('is hidden from the page and from screen readers while idle, but keeps its space', () => {
    const { container } = render(<LoadSpinner active={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('.load-spinner')).toHaveClass('load-spinner-idle');
  });
});
