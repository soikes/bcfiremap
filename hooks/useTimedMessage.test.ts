import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { useTimedMessage } from './useTimedMessage';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Moves the fake clock forward inside act, so React applies the resulting updates. */
const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

describe('useTimedMessage', () => {
  it('starts empty, holds a message, then clears it after the time', () => {
    const { result } = renderHook(() => useTimedMessage(60));
    expect(result.current[0]).toBeNull();

    act(() => result.current[1]('Hello'));
    expect(result.current[0]).toBe('Hello');

    advance(59);
    expect(result.current[0]).toBe('Hello');
    advance(1);
    expect(result.current[0]).toBeNull();
  });

  it('restarts the countdown when a new message is set', () => {
    const { result } = renderHook(() => useTimedMessage(150));
    act(() => result.current[1]('First'));
    advance(100);
    act(() => result.current[1]('Second'));
    advance(100);
    expect(result.current[0]).toBe('Second');

    advance(50);
    expect(result.current[0]).toBeNull();
  });

  it('clears straight away when set to null', () => {
    const { result } = renderHook(() => useTimedMessage(5000));
    act(() => result.current[1]('Hello'));
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
  });
});
