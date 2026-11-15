import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';

/** The message of the error a callback throws. */
const messageOf = (callback: () => unknown): string => {
  try {
    callback();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('Expected the callback to throw');
};

const bigPage = () =>
  render(
    <main>
      {Array.from({ length: 300 }, (_, i) => (
        <p key={i} className="row">{`Row ${i} with some text to make the page large`}</p>
      ))}
      <button type="button">Go</button>
    </main>,
  );

describe('test setup failure messages', () => {
  it('still passes and fails the jest-dom checks as before', () => {
    bigPage();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toHaveTextContent('Go');
    expect(() => expect(screen.getByRole('button', { name: 'Go' })).not.toBeInTheDocument()).toThrow();
    expect(() => expect(screen.getByRole('button', { name: 'Go' })).toHaveTextContent('Stop')).toThrow();
    expect(screen.queryByText('Missing')).not.toBeInTheDocument();
  });

  it('keeps a failed element check to a short, readable line', () => {
    bigPage();
    const message = messageOf(() => expect(screen.getByRole('button', { name: 'Go' })).not.toBeInTheDocument());
    expect(message).toContain('toBeInTheDocument');
    expect(message).toContain('<button');
    expect(message.length).toBeLessThan(400);
  });

  it('keeps a failed text check short, and says what the element holds', () => {
    bigPage();
    const message = messageOf(() => expect(screen.getByRole('main')).toHaveTextContent('Nothing like this'));
    expect(message).toContain('toHaveTextContent(Nothing like this)');
    expect(message.length).toBeLessThan(400);
  });

  it('keeps a failed query short, without printing the page', () => {
    bigPage();
    const message = messageOf(() => screen.getByText('Not on this page'));
    expect(message).toContain('Not on this page');
    expect(message).not.toContain('Row 100');
    expect(message.length).toBeLessThan(400);
  });
});
