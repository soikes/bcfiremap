import { LEVEL_LABEL, PERMISSION_COLORS, STATUS_COLORS, TYPE_LABEL } from '../constants/banStyle';
import { FireBan } from '../types/ban';
import { active } from '../utils/bans';
import './BanCard.css';

interface Props {
  ban: FireBan;
}

/** Summary card for a single fire ban: jurisdiction and active/inactive badges, region, what it regulates with a green ✓ Permitted or red ✕ Not permitted, description, date and bulletin link, coloured by status. */
export function BanCard({ ban }: Props) {
  const isActive = active(ban);
  const color = STATUS_COLORS[isActive ? 'active' : 'inactive'].solid;
  return (
    <article className="ban-card" style={{ borderLeftColor: color }}>
      <div className="ban-card-badges">
        <span className="ban-card-badge" style={{ backgroundColor: color }}>
          {LEVEL_LABEL[ban.level]}
        </span>
        <span className="ban-card-badge ban-card-status" style={{ borderColor: color, color }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <h3 className="ban-card-region">{ban.region}</h3>
      <p className="ban-card-type">
        <span>{ban.title ?? TYPE_LABEL[ban.type]}:</span>{' '}
        <span className="ban-card-permission" style={{ color: PERMISSION_COLORS[isActive ? 'notPermitted' : 'permitted'] }}>
          <span aria-hidden="true">{isActive ? '✕' : '✓'}</span> {isActive ? 'Not permitted' : 'Permitted'}
        </span>
      </p>
      {ban.description ? <p className="ban-card-description">{ban.description}</p> : null}
      {ban.effectiveDate ? <p className="ban-card-date">Effective {ban.effectiveDate}</p> : null}
      {ban.url ? (
        <a className="ban-card-link" href={ban.url} target="_blank" rel="noreferrer">
          Official bulletin
        </a>
      ) : null}
    </article>
  );
}
