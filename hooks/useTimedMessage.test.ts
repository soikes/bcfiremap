import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { useTimedMessage } from './useTimedMessage';

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('useTimedMessage', () => {
  it('starts empty, holds a message, then clears it after the time', async () => {
    const { result } = renderHook(() => useTimedMessage(60));
    expect(result.current[0]).toBeNull();

    act(() => result.current[1]('Hello'));
    expect(result.current[0]).toBe('Hello');

    await waitFor(() => expect(result.current[0]).toBeNull());
  });

  it('restarts the countdown when a new message is set', async () => {
    const { result } = renderHook(() => useTimedMessage(150));
    act(() => result.current[1]('First'));
    await act(() => pause(100));
    act(() => result.current[1]('Second'));
    await act(() => pause(100));
    expect(result.current[0]).toBe('Second');

    await waitFor(() => expect(result.current[0]).toBeNull());
  });

  it('clears straight away when set to null', () => {
    const { result } = renderHook(() => useTimedMessage(5000));
    act(() => result.current[1]('Hello'));
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
  });
});
