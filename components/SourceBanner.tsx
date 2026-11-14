import { SourceStatus } from '../types/api';
import { failedSources, joinNames } from '../utils/sourceStatus';
import './SourceBanner.css';

interface Props {
  sources: SourceStatus[];
}

/** Banner over the map naming the sources that failed with no data to show; renders nothing when none did. */
export function SourceBanner({ sources }: Props) {
  const failed = failedSources(sources);
  if (failed.length === 0) return null;
  const names = joinNames(failed.map(source => source.name));
  return (
    <div className="source-banner" role="alert">
      {`⚠ Couldn't load ${names}. Bans may be missing from the map.`}
    </div>
  );
}
