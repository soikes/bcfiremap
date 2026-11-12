import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { Collector } from '../collectors/types';
import { makeBan } from '../test/fixtures';
import { FireBan } from '../types/ban';
import { useBans } from './useBans';

const collector = (id: string, collect: () => Promise<FireBan[]>): Collector => ({
  id,
  name: `Source ${id}`,
  coverage: `Coverage ${id}`,
  attribution: '',
  refetchIntervalMs: 60000,
  collect,
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useBans', () => {
  it('merges the bans from every collector', async () => {
    const collectors = [
      collector('a', async () => [makeBan({ id: 'a1' })]),
      collector('b', async () => [makeBan({ id: 'b1' }), makeBan({ id: 'b2' })]),
    ];
    const { result } = await renderHook(() => useBans(collectors), { wrapper });

    await waitFor(() => expect(result.current.bans).toHaveLength(3));

    expect(result.current.bans.map(ban => ban.id)).toEqual(['a1', 'b1', 'b2']);
    expect(result.current.sources.map(source => source.status)).toEqual(['success', 'success']);
  });

  it('reports a failing source and still returns the others', async () => {
    const collectors = [
      collector('good', async () => [makeBan({ id: 'g1' })]),
      collector('bad', async () => {
        throw new Error('down');
      }),
    ];
    const { result } = await renderHook(() => useBans(collectors), { wrapper });

    await waitFor(() => expect(result.current.sources[1].status).toBe('error'));

    expect(result.current.bans.map(ban => ban.id)).toEqual(['g1']);
    expect(result.current.sources[1]).toMatchObject({ id: 'bad', hasData: false });
    expect(result.current.sources[0]).toMatchObject({ id: 'good', status: 'success', hasData: true });
  });

  it('reports a source as pending until it answers', async () => {
    const collectors = [collector('slow', () => new Promise<FireBan[]>(() => {}))];
    const { result } = await renderHook(() => useBans(collectors), { wrapper });

    expect(result.current.bans).toEqual([]);
    expect(result.current.sources[0]).toMatchObject({ status: 'pending', hasData: false });
  });

  it('carries each collector name, coverage and attribution through', async () => {
    const collectors = [{ ...collector('a', async () => []), attribution: 'Credit a' }];
    const { result } = await renderHook(() => useBans(collectors), { wrapper });

    expect(result.current.sources[0]).toMatchObject({
      id: 'a',
      name: 'Source a',
      coverage: 'Coverage a',
      attribution: 'Credit a',
    });
  });
});
