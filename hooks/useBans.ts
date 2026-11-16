import { useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { BROWSER_COLLECTORS } from '../collectors/constants/browser';
import { BANS_API_PATH } from '../constants/api';
import { BansResponse, LoadStatus, SourceStatus } from '../types/api';
import { FireBan } from '../types/ban';
import { Collector } from '../types/collector';
import { parseBansResponse, validBans } from '../utils/bans';
import { fetchJson } from '../utils/web';

/** Stands in for the server's sources until the server has answered, or after it failed to. */
const serverPlaceholder = (status: LoadStatus): SourceStatus => ({
  id: 'server',
  name: 'BC Fire Bans server',
  coverage: "Bans gathered by this site's server.",
  attribution: '',
  status,
  updatedAt: 0,
});

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

  return useMemo(
    () => ({
      bans: [...browser.bans, ...(server.data?.bans ?? [])],
      sources: [...browser.sources, ...(server.data?.sources ?? [serverPlaceholder(server.status)])],
    }),
    [browser, server.data, server.status],
  );
}
