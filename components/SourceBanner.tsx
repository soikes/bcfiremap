import { SourceStatus } from '../types/api';
import { failedSources, loadingSources, retryingSources, sourceNames } from '../utils/bans';
import './SourceBanner.css';

interface Props {
  sources: SourceStatus[];
}

interface Line {
  key: string;
  text: string;
  inFlight: boolean;
}

/** Groups the sources by state, most serious first, as banner lines; each source appears in at most one. */
function bannerLines(sources: SourceStatus[]): Line[] {
  const failed = failedSources(sources).filter(source => !source.fetching);
  const retrying = retryingSources(sources);
  const loading = loadingSources(sources);
  return [
    failed.length > 0 && {
      key: 'failed',
      text: `⚠ Couldn't load ${sourceNames(failed)}. Bans may be missing from the map.`,
      inFlight: false,
    },
    retrying.length > 0 && {
      key: 'retrying',
      text: `Couldn't load ban data from ${sourceNames(retrying)}. Retrying…`,
      inFlight: true,
    },
    loading.length > 0 && { key: 'loading', text: `Loading ban data from ${sourceNames(loading)}…`, inFlight: true },
  ].filter((line): line is Line => Boolean(line));
}

/** Banner over the map naming the sources that are loading, being retried, or failed with no data to show; quiet while they only load, a warning once one fails. */
export function SourceBanner({ sources }: Props) {
  const lines = bannerLines(sources);
  if (lines.length === 0) return null;
  const warning = lines.some(line => line.key !== 'loading');
  return (
    <div className={warning ? 'source-banner source-banner-warning' : 'source-banner'} role="status">
      {lines.map(line => (
        <p key={line.key} className="source-banner-line">
          {line.inFlight ? <span className="source-banner-spinner" aria-hidden="true" /> : null}
          {line.text}
        </p>
      ))}
    </div>
  );
}
