import { useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { BROWSER_COLLECTORS } from '../collectors/constants/browser';
import { BANS_API_PATH } from '../constants/api';
import { BansResponse, SourceStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { parseBansResponse, validBans } from '../utils/bans';
import { fetchJson } from '../utils/web';

/** Stands in for the server itself: until it has answered, or while a request to it is in flight or being retried. */
const serverPlaceholder = (
  state: Pick<SourceStatus, 'status' | 'hasData' | 'fetching' | 'retrying' | 'updatedAt'>,
): SourceStatus => ({
  id: 'server',
  name: 'BC Fire Bans server',
  coverage: "Bans gathered on a schedule by this site's server.",
  attribution: '',
  ...state,
});

/** True if a query's last attempt failed and it is trying again. */
const isRetrying = (result: Pick<UseQueryResult, 'failureCount' | 'fetchStatus'>) =>
  result.failureCount > 0 && result.fetchStatus !== 'idle';

/** True if a query has a request in flight. */
const isFetching = (result: Pick<UseQueryResult, 'fetchStatus'>) => result.fetchStatus === 'fetching';

/** Runs the browser collectors and fetches the server's bans, each once on page load (retrying a failed load), and merges both. */
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
        fetching: isFetching(result),
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
      staleTime: Infinity,
    })),
    combine,
  });

  const server = useQuery({
    queryKey: ['server-bans'],
    queryFn: async ({ signal }) => parseBansResponse(await fetchJson(BANS_API_PATH, signal)),
    staleTime: Infinity,
  });

  const serverFetching = isFetching(server);
  const serverRetrying = isRetrying(server);

  return useMemo(() => {
    const { status, data, dataUpdatedAt } = server;
    const busy = serverFetching || serverRetrying;
    const serverSources = data
      ? [
          ...data.sources,
          ...(busy
            ? [serverPlaceholder({ status, hasData: true, fetching: serverFetching, retrying: serverRetrying, updatedAt: dataUpdatedAt })]
            : []),
        ]
      : [serverPlaceholder({ status, hasData: false, fetching: serverFetching, retrying: serverRetrying, updatedAt: 0 })];
    return {
      bans: [...browser.bans, ...(data?.bans ?? [])],
      sources: [...browser.sources, ...serverSources],
    };
  }, [browser, server.status, server.data, server.dataUpdatedAt, serverFetching, serverRetrying]);
}
