import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'bun:test';
import { makeSource } from '../test/fixtures';
import { SourceStatus } from '../types/api';
import { LOAD_FAILED_MESSAGE, useLoadStatus } from './useLoadStatus';

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const loading = (id: string, extra: Partial<SourceStatus> = {}) =>
  makeSource({ id, name: id, status: 'pending', hasData: false, fetching: true, ...extra });
const failed = (id: string) => makeSource({ id, name: id, status: 'error', hasData: false });
const loaded = (id: string) => makeSource({ id, name: id });

const setup = (initial: SourceStatus[], options = { timeoutMs: 80, messageMs: 5000 }) =>
  renderHook(({ sources }: { sources: SourceStatus[] }) => useLoadStatus(sources, options), { initialProps: { sources: initial } });

describe('useLoadStatus loading', () => {
  it('is loading while any source has a request in flight or being retried', () => {
    expect(setup([loaded('A'), loading('B')]).result.current.loading).toBe(true);
    expect(setup([loaded('A'), loading('B', { fetching: false, retrying: true })]).result.current.loading).toBe(true);
  });

  it('is loading while a source refreshes data it already has', () => {
    expect(setup([makeSource({ fetching: true })]).result.current.loading).toBe(true);
  });

  it('is not loading when nothing is in flight, or there are no sources', () => {
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

  it('stops loading after the timeout even though a source is still loading', async () => {
    const { result } = setup([loading('A')]);
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('gives each new round of loading its own timeout', async () => {
    const { result, rerender } = setup([loading('A')]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ sources: [loaded('A')] });
    rerender({ sources: [loaded('A'), loading('B')] });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
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

  it('says so when a source timed out without data', async () => {
    const { result } = setup([loaded('A'), loading('B')]);
    await waitFor(() => expect(result.current.message).toBe(LOAD_FAILED_MESSAGE));
    expect(result.current.loading).toBe(false);
  });

  it('does not count a failed refresh that left older data on the map', () => {
    const { result, rerender } = setup([loading('A')]);
    rerender({ sources: [makeSource({ id: 'A', status: 'error', hasData: true })] });
    expect(result.current.message).toBeNull();
  });

  it('clears the message after the message time', async () => {
    const { result, rerender } = setup([loading('A')], { timeoutMs: 5000, messageMs: 60 });
    rerender({ sources: [failed('A')] });
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
    await waitFor(() => expect(result.current.message).toBeNull());
  });

  it('does not repeat the message for the same failed sources on the next load', async () => {
    const { result, rerender } = setup([loading('A')], { timeoutMs: 5000, messageMs: 40 });
    rerender({ sources: [failed('A')] });
    await waitFor(() => expect(result.current.message).toBeNull());

    rerender({ sources: [loading('A', { status: 'error' })] });
    rerender({ sources: [failed('A')] });
    await act(() => pause(30));
    expect(result.current.message).toBeNull();
  });

  it('says it again for a different failure, and again after the failure cleared', async () => {
    const { result, rerender } = setup([loading('A'), loading('B')], { timeoutMs: 5000, messageMs: 40 });
    rerender({ sources: [failed('A'), loaded('B')] });
    await waitFor(() => expect(result.current.message).toBeNull());

    rerender({ sources: [loading('A'), loaded('B')] });
    rerender({ sources: [failed('A'), failed('B')] });
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
    await waitFor(() => expect(result.current.message).toBeNull());

    rerender({ sources: [loaded('A'), loaded('B')] });
    rerender({ sources: [failed('A'), loaded('B')] });
    expect(result.current.message).toBe(LOAD_FAILED_MESSAGE);
  });
});
