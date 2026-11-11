import { Polygon } from 'react-native-maps';
import { FireZone } from '../hooks/useFireZones';

interface Props {
  zones: FireZone[];
}

/** Draws the provincial fire zone outlines (one Polygon per zone ring set). */
export function FireZoneOutlines({ zones }: Props) {
  return (
    <>
      {zones.flatMap(zone =>
        zone.polygons.map((poly, i) => (
          <Polygon
            key={`${zone.id}-${i}`}
            coordinates={poly.outer}
            holes={poly.holes.length > 0 ? poly.holes : undefined}
            strokeColor="rgba(220, 80, 20, 0.8)"
            fillColor="rgba(0, 0, 0, 0)"
            strokeWidth={1}
          />
        ))
      )}
    </>
  );
}
