import { ReactNode } from 'react';
import { LatLng } from '../hooks/useFireZones';

export interface BaseMapProps {
  onPress: (coordinate: LatLng) => void;
  children?: ReactNode;
}
