import { BAN_COLORS, LEVEL_LABEL, TYPE_LABEL } from '../constants/banStyle';
import { FireBan } from '../types/ban';
import './BanCard.css';

interface Props {
  ban: FireBan;
}

/** Summary card for a single fire ban: level badge, region, type, description, date and bulletin link. */
export function BanCard({ ban }: Props) {
  const c = BAN_COLORS[ban.level];
  return (
    <article className="ban-card" style={{ borderLeftColor: c.stroke }}>
      <span className="ban-card-badge" style={{ backgroundColor: c.stroke }}>
        {LEVEL_LABEL[ban.level]}
      </span>
      <h3 className="ban-card-region">{ban.region}</h3>
      <p className="ban-card-type">{ban.title ?? TYPE_LABEL[ban.type]}</p>
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
