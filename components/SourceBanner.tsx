import { SourceStatus } from '../types/api';
import { failedSources, joinNames, retryingSources } from '../utils/sourceStatus';
import './SourceBanner.css';

interface Props {
  sources: SourceStatus[];
}

/** Joins the names of the given sources for a message. */
const namesOf = (sources: SourceStatus[]) => joinNames(sources.map(source => source.name));

/** Banner over the map naming the sources being retried and those that failed with no data to show; renders nothing when there are none. */
export function SourceBanner({ sources }: Props) {
  const retrying = retryingSources(sources);
  const failed = failedSources(sources).filter(source => !source.retrying);
  if (retrying.length === 0 && failed.length === 0) return null;
  return (
    <div className="source-banner" role="alert">
      {retrying.length > 0 ? (
        <p className="source-banner-line">{`⚠ Couldn't load ban data from ${namesOf(retrying)}. Retrying…`}</p>
      ) : null}
      {failed.length > 0 ? (
        <p className="source-banner-line">{`⚠ Couldn't load ${namesOf(failed)}. Bans may be missing from the map.`}</p>
      ) : null}
    </div>
  );
}
