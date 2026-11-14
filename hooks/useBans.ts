import { Query, useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { BROWSER_COLLECTORS } from '../collectors/browser';
import { Collector } from '../collectors/types';
import { BansResponse, LoadStatus, SourceStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { fetchJson } from '../utils/fetchJson';
import { parseBansResponse, validBans } from '../utils/validate';

export const SERVER_BANS_URL = '/api/bans';

const SERVER_REFRESH_MS = 5 * 60 * 1000;
const SERVER_WAITING_MS = 5 * 1000;

/** Stands in for the server itself: until it has answered, or while a request to it is being retried. */
const serverPlaceholder = (state: Pick<SourceStatus, 'status' | 'hasData' | 'retrying' | 'updatedAt'>): SourceStatus => ({
  id: 'server',
  name: 'BC Fire Bans server',
  coverage: "Bans gathered on a schedule by this site's server.",
  attribution: '',
  ...state,
});

/** True if a query's last attempt failed and it is trying again. */
const isRetrying = (result: Pick<UseQueryResult, 'failureCount' | 'fetchStatus'>) =>
  result.failureCount > 0 && result.fetchStatus !== 'idle';

/** Polls the server sooner while one of its sources is still waiting on a first answer or retrying. */
const serverRefetchInterval = (query: Query<BansResponse>) =>
  query.state.data?.sources.some(source => source.status === 'pending' || source.retrying)
    ? SERVER_WAITING_MS
    : SERVER_REFRESH_MS;

/** Runs the browser collectors on their own schedules, fetches the server's bans, and merges both, keeping the last good data if a refresh fails. */
export function useBans(collectors: Collector[] = BROWSER_COLLECTORS): BansResponse {
  const combine = useCallback(
    (results: UseQueryResult<FireBan[]>[]): BansResponse => ({
      bans: results.flatMap(result => result.data ?? []),
      sources: results.map((result, i) => ({
        id: collectors[i].id,
        name: collectors[i].name,
        coverage: collectors[i].coverage,
        attribution: collectors[i].attribution,
        status: result.status,
        hasData: result.data !== undefined,
        retrying: isRetrying(result),
        updatedAt: result.dataUpdatedAt,
      })),
    }),
    [collectors],
  );

  const browser = useQueries({
    queries: collectors.map(collector => ({
      queryKey: ['bans', collector.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) => validBans(await collector.collect(signal), collector.id),
      refetchInterval: collector.refetchIntervalMs,
      staleTime: collector.refetchIntervalMs / 2,
    })),
    combine,
  });

  const server = useQuery({
    queryKey: ['server-bans'],
    queryFn: async ({ signal }) => parseBansResponse(await fetchJson(SERVER_BANS_URL, signal)),
    refetchInterval: serverRefetchInterval,
  });

  const serverRetrying = isRetrying(server);

  return useMemo(() => {
    const { status, data, dataUpdatedAt } = server;
    const serverSources = data
      ? [
          ...data.sources,
          ...(serverRetrying ? [serverPlaceholder({ status, hasData: true, retrying: true, updatedAt: dataUpdatedAt })] : []),
        ]
      : [serverPlaceholder({ status, hasData: false, retrying: serverRetrying, updatedAt: 0 })];
    return {
      bans: [...browser.bans, ...(data?.bans ?? [])],
      sources: [...browser.sources, ...serverSources],
    };
  }, [browser, server.status, server.data, server.dataUpdatedAt, serverRetrying]);
}
