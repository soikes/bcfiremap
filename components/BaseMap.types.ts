import { ReactNode } from 'react';
import { LatLng } from '../types/geo';

export interface BaseMapProps {
  onPress: (coordinate: LatLng) => void;
  children?: ReactNode;
}
