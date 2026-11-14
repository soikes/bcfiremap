import { SourceStatus } from '../types/api';

/** Returns the sources that failed and have no data to show. */
export const failedSources = (sources: SourceStatus[]) =>
  sources.filter(source => source.status === 'error' && !source.hasData);

/** Returns the sources whose last attempt failed and that are trying again. */
export const retryingSources = (sources: SourceStatus[]) => sources.filter(source => source.retrying);

/** Joins names as "A", "A and B" or "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
