import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { ErrorBoundary } from './ErrorBoundary';

/** Throws while rendering when `fail` is set, otherwise shows a label. */
function Child({ fail }: { fail: boolean }) {
  if (fail) throw new Error('render failed');
  return <p>child content</p>;
}

let consoleError: ReturnType<typeof spyOn>;

beforeEach(() => {
  consoleError = spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary name="test" fallback={<p>fallback</p>}>
        <Child fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('renders the fallback and logs the error when a child throws', () => {
    render(
      <ErrorBoundary name="test" fallback={<p>fallback</p>}>
        <Child fail />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith('[ErrorBoundary] test failed', expect.any(Error), expect.anything());
  });

  it('keeps sibling content outside the boundary on screen', () => {
    render(
      <>
        <p>map</p>
        <ErrorBoundary name="test" fallback={null}>
          <Child fail />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getByText('map')).toBeInTheDocument();
  });

  it('tries the children again when the reset key changes', () => {
    const { rerender } = render(
      <ErrorBoundary name="test" fallback={<p>fallback</p>} resetKey={1}>
        <Child fail />
      </ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary name="test" fallback={<p>fallback</p>} resetKey={2}>
        <Child fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('stays on the fallback while the reset key is unchanged', () => {
    const { rerender } = render(
      <ErrorBoundary name="test" fallback={<p>fallback</p>} resetKey={1}>
        <Child fail />
      </ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary name="test" fallback={<p>fallback</p>} resetKey={1}>
        <Child fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
  });
});
