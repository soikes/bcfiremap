import { useQueries, UseQueryResult } from '@tanstack/react-query';
import { useCallback } from 'react';
import { COLLECTORS } from '../collectors';
import { Collector, SourceStatus } from '../collectors/types';
import { FireBan } from '../types/ban';

export interface BansState {
  bans: FireBan[];
  sources: SourceStatus[];
}

/** Runs every collector on its own schedule and merges the bans, keeping the last good data if a refresh fails. */
export function useBans(collectors: Collector[] = COLLECTORS): BansState {
  const combine = useCallback(
    (results: UseQueryResult<FireBan[]>[]): BansState => ({
      bans: results.flatMap(result => result.data ?? []),
      sources: results.map((result, i) => ({
        id: collectors[i].id,
        name: collectors[i].name,
        coverage: collectors[i].coverage,
        attribution: collectors[i].attribution,
        status: result.status,
        hasData: result.data !== undefined,
        updatedAt: result.dataUpdatedAt,
      })),
    }),
    [collectors],
  );

  return useQueries({
    queries: collectors.map(collector => ({
      queryKey: ['bans', collector.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => collector.collect(signal),
      refetchInterval: collector.refetchIntervalMs,
      staleTime: collector.refetchIntervalMs / 2,
    })),
    combine,
  });
}
