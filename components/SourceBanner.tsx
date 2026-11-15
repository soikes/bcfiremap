import { SourceStatus } from '../types/api';
import './SourceBanner.css';

interface Props {
  sources: SourceStatus[];
}

type RowState = 'failed' | 'retrying' | 'loading';

/** Most urgent first: the banner reports the first of these that any source is in. */
const ROW_ORDER: RowState[] = ['failed', 'retrying', 'loading'];

const ROW_TEXT: Record<RowState, (who: string) => string> = {
  loading: who => `Loading ban data from ${who}…`,
  retrying: who => `Couldn't load ban data from ${who}. Retrying…`,
  failed: who => `⚠ Couldn't load ${who}. Bans may be missing from the map.`,
};

/** What the banner says about a source, or null when it has loaded and there is nothing to say. */
function rowState(source: SourceStatus): RowState | null {
  if (source.retrying) return 'retrying';
  if (source.fetching) return 'loading';
  if (source.status === 'error' && !source.hasData) return 'failed';
  return null;
}

/** Names a group of sources: one or two by name, more by count. */
const who = (sources: SourceStatus[]) =>
  sources.length <= 2 ? sources.map(source => source.name).join(' and ') : `${sources.length} sources`;

/** One row over the map for every source that is loading, being retried, or failed with no data, reporting the most urgent of those states and naming (or counting) the sources in it; gone once every source has loaded. */
export function SourceBanner({ sources }: Props) {
  const states = sources.map(source => ({ source, state: rowState(source) }));
  const state = ROW_ORDER.find(each => states.some(entry => entry.state === each));
  if (!state) return null;
  const group = states.filter(entry => entry.state === state).map(entry => entry.source);
  return (
    <ul className="source-banner" role="status">
      <li className={`source-banner-row source-banner-${state}`}>
        {state === 'failed' ? null : <span className="source-banner-spinner" aria-hidden="true" />}
        <span className="source-banner-text">{ROW_TEXT[state](who(group))}</span>
      </li>
    </ul>
  );
}
