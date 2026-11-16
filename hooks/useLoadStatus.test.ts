import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';
import { makeSource } from '../test/fixtures';
import { SourceStatus } from '../types/api';
import { LOAD_FAILED_MESSAGE, useLoadStatus } from './useLoadStatus';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Moves the fake clock forward inside act, so React applies the resulting updates. */
const advance = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

const loading = (id: string) => makeSource({ id, name: id, status: 'pending' });
const failed = (id: string) => makeSource({ id, name: id, status: 'error' });
const loaded = (id: string) => makeSource({ id, name: id });

const setup = (initial: SourceStatus[], options = { timeoutMs: 1000, messageMs: 5000 }) =>
  renderHook(({ sources }: { sources: SourceStatus[] }) => useLoadStatus(sources, options), { initialProps: { sources: initial } });

describe('useLoadStatus loading', () => {
  it('is loading while any source has not loaded yet', () => {
    expect(setup([loaded('A'), loading('B')]).result.current.loading).toBe(true);
  });

  it('is not loading when every source has loaded or failed, or there are no sources', () => {
    expect(setup([loaded('A'), failed('B')]).result.current.loading).toBe(false);
    expect(setup([loaded('A')]).result.current.loading).toBe(false);
    expect(setup([]).result.current.loading).toBe(false);
  });

  it('stops loading when the sources finish', () => {
    const { result, rerender } = setup([loading('A'), loading('B')]);
    rerender({ sources: [loaded('A'), loading('B')] });
    expect(result.current.loading).toBe(true);
    rerender({ sources: [loaded('A'), loaded('B')] });
    expect(result.current.loading).toBe(false);
  });

  it('stops loading after the timeout even though a source is still loading', () => {
    const { result } = setup([loading('A')]);
    advance(999);
    expect(result.current.loading).toBe(true);
    advance(1);
    expect(result.current.loading).toBe(false);
  });
});

describe('useLoadStatus message', () => {
  it('has no message while loading, even if a source already failed', () => {
    const { result } = setup([failed('A'), loading('B')], { timeoutMs: 5000, messageMs: 5000 });
    expect(result.current.message).toBeNull();
  });

  it('has no message when everything loaded', () => {
    const { result, rerender } = setup([loading('A')]);
    rerender({ sources: [loaded('A')] });
    expect(result.current.message).toBeNull();
  });

  it('says so once loading ends with a source that failed', () => {
    const { result, rerender } = setup([loading('A'), loading('B')]);
    rerender({ sources: [loaded('A'), failed('B')] });
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
  });

  it('says so when a source timed out without data', () => {
    const { result } = setup([loaded('A'), loading('B')]);
    expect(result.current.message).toBeNull();
    advance(1000);
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
    expect(result.current.loading).toBe(false);
  });

  it('clears the message after the message time', () => {
    const { result, rerender } = setup([loading('A')], { timeoutMs: 5000, messageMs: 6000 });
    rerender({ sources: [failed('A')] });
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
    advance(5999);
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
    advance(1);
    expect(result.current.message).toBeNull();
  });

  it('does not repeat the message when a source that timed out later fails', () => {
    const { result, rerender } = setup([loading('A')], { timeoutMs: 1000, messageMs: 40 });
    advance(1000);
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
    advance(40);
    expect(result.current.message).toBeNull();

    rerender({ sources: [failed('A')] });
    expect(result.current.message).toBeNull();
  });

  it('says it again when the set of sources without data changes after a timeout', () => {
    const { result, rerender } = setup([loaded('A'), loading('B'), loading('C')], { timeoutMs: 1000, messageMs: 40 });
    advance(1000);
    rerender({ sources: [loaded('A'), failed('B'), loading('C')] });
    advance(40);
    expect(result.current.message).toBeNull();

    rerender({ sources: [loaded('A'), loaded('B'), failed('C')] });
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
  });
});
