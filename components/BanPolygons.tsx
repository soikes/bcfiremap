import { Polygon } from 'react-native-maps';
import { BAN_COLORS } from '../constants/banStyle';
import { FireBan } from '../data/fireBans';

interface Props {
  bans: FireBan[];
}

/** Draws each ban's jurisdiction polygon, colored by ban level. */
export function BanPolygons({ bans }: Props) {
  return (
    <>
      {bans.map(ban => {
        const c = BAN_COLORS[ban.level];
        return (
          <Polygon
            key={ban.id}
            coordinates={ban.polygon}
            strokeColor={c.stroke}
            fillColor={c.fill}
            strokeWidth={2}
          />
        );
      })}
    </>
  );
}
