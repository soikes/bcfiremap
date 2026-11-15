import { ACTIVITY_LABEL, LEVEL_LABEL, PERMISSION_STYLE } from '../constants/banStyle';
import { FireBan } from '../types/ban';
import { currentPeriod, permissionAt } from '../utils/bans';
import './BanCard.css';

interface Props {
  ban: FireBan;
}

/** Summary card for a single fire ban: jurisdiction badge, region, the activity with what it permits now (✕ Prohibited, ! By permit only or ✓ Allowed), description, start date and bulletin link, coloured by that permission. */
export function BanCard({ ban }: Props) {
  const style = PERMISSION_STYLE[permissionAt(ban)];
  const from = currentPeriod(ban)?.from;
  const activity = ban.activity === 'other' ? (ban.title ?? ACTIVITY_LABEL.other) : ACTIVITY_LABEL[ban.activity];
  return (
    <article className="ban-card" style={{ borderLeftColor: style.solid }}>
      <div className="ban-card-badges">
        <span className="ban-card-badge" style={{ backgroundColor: style.solid }}>
          {LEVEL_LABEL[ban.level]}
        </span>
      </div>
      <h3 className="ban-card-region">{ban.region}</h3>
      <p className="ban-card-type">
        <span>{activity}:</span>{' '}
        <span className="ban-card-permission" style={{ color: style.solid }}>
          <span aria-hidden="true">{style.icon}</span> {style.label}
        </span>
      </p>
      {ban.description ? <p className="ban-card-description">{ban.description}</p> : null}
      {from ? <p className="ban-card-date">Effective {from}</p> : null}
      {ban.url ? (
        <a className="ban-card-link" href={ban.url} target="_blank" rel="noreferrer">
          Official bulletin
        </a>
      ) : null}
    </article>
  );
}
