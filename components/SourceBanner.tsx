import { SourceStatus } from '../types/api';
import './SourceBanner.css';

interface Props {
  sources: SourceStatus[];
}

type RowState = 'loading' | 'retrying' | 'failed';

const ROW_TEXT: Record<RowState, (name: string) => string> = {
  loading: name => `Loading ban data from ${name}…`,
  retrying: name => `Couldn't load ban data from ${name}. Retrying…`,
  failed: name => `⚠ Couldn't load ${name}. Bans may be missing from the map.`,
};

/** What the banner says about a source, or null when it has loaded and there is nothing to say. */
function rowState(source: SourceStatus): RowState | null {
  if (source.retrying) return 'retrying';
  if (source.fetching) return 'loading';
  if (source.status === 'error' && !source.hasData) return 'failed';
  return null;
}

/** Stack of rows over the map, one per source that is loading, being retried, or failed with no data; each row leaves once its source has loaded. */
export function SourceBanner({ sources }: Props) {
  const rows = sources.flatMap(source => {
    const state = rowState(source);
    return state ? [{ source, state }] : [];
  });
  if (rows.length === 0) return null;
  return (
    <ul className="source-banner" role="status">
      {rows.map(({ source, state }) => (
        <li key={source.id} className={`source-banner-row source-banner-${state}`}>
          {state === 'failed' ? null : <span className="source-banner-spinner" aria-hidden="true" />}
          <span className="source-banner-text">{ROW_TEXT[state](source.name)}</span>
        </li>
      ))}
    </ul>
  );
}
