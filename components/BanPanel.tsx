import { SourceStatus } from "../types/api";
import { FireBan } from "../types/ban";
import { active, failedSources } from "../utils/bans";
import { BanCard } from "./BanCard";
import "./BanPanel.css";

interface Props {
  bans: FireBan[];
  sources: SourceStatus[];
  onClose: () => void;
}

/** Headline for the panel, based on the bans in effect, the inactive bans found and whether every source loaded; null when every source loaded and nothing was found, so there is nothing to show. */
function panelTitle(bans: FireBan[], sources: SourceStatus[]): string | null {
  const inEffect = bans.filter((ban) => active(ban)).length;
  if (inEffect > 0)
    return `${inEffect} fire ban${inEffect !== 1 ? "s" : ""} in effect`;
  if (bans.length > 0) return "No fire bans in effect right now";
  if (sources.some((s) => s.status === "pending" && !s.hasData))
    return "Loading ban data…";
  if (failedSources(sources).length > 0)
    return "No fire bans found in the sources that loaded";
  return null;
}

/** One-line status for a data source. */
function sourceLine(source: SourceStatus): string {
  const time = new Date(source.updatedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (source.retrying) {
    return source.hasData
      ? `${source.name}: update failed, retrying… (showing data from ${time})`
      : `${source.name}: couldn't load, retrying…`;
  }
  if (source.status === "error") {
    return source.hasData
      ? `${source.name}: update failed, showing data from ${time}`
      : `${source.name}: unavailable`;
  }
  if (!source.hasData) return `${source.name}: loading…`;
  return `${source.name}: updated ${time}`;
}

/** Keeps the sources that supplied one of the bans shown, plus any that haven't loaded cleanly, since those may be hiding bans. */
function relevantSources(
  bans: FireBan[],
  sources: SourceStatus[],
): SourceStatus[] {
  return sources.filter(
    (s) =>
      bans.some((ban) => ban.source === s.id) ||
      s.status !== "success" ||
      s.retrying,
  );
}

/** Stand-in for the panel after it failed to render, asking the user to tap again. */
export function BanPanelFallback() {
  return (
    <div className="ban-panel">
      <section className="ban-panel-sheet">
        <p className="ban-panel-warning">
          ⚠ Couldn't show the bans for this location. Tap the map to try again.
        </p>
      </section>
    </div>
  );
}

/** Bottom sheet listing the fire bans at the selected location, and which sources were checked; renders nothing when every source loaded and there are no bans. */
export function BanPanel({ bans, sources, onClose }: Props) {
  const title = panelTitle(bans, sources);
  if (title === null) return null;
  const shown = relevantSources(bans, sources);
  const attributions = [
    ...new Set(shown.map((s) => s.attribution).filter(Boolean)),
  ];
  const someFailed = failedSources(sources).length > 0;

  return (
    <div className="ban-panel">
      <section className="ban-panel-sheet">
        <header className="ban-panel-header">
          <h2 className="ban-panel-title">{title}</h2>
          <button
            type="button"
            className="ban-panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        {someFailed ? (
          <p className="ban-panel-warning">
            ⚠ Some sources couldn't be checked, so bans may be missing.
          </p>
        ) : null}
        <div className="ban-panel-scroll">
          {bans.map((ban) => (
            <BanCard key={ban.id} ban={ban} />
          ))}
          <div className="ban-panel-sources">
            {shown.map((source) => (
              <div key={source.id} className="ban-panel-source">
                <p className="ban-panel-source-line">{sourceLine(source)}</p>
                <p className="ban-panel-source-coverage">{source.coverage}</p>
              </div>
            ))}
            {attributions.map((attribution) => (
              <p key={attribution} className="ban-panel-source-coverage">
                {attribution}
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
