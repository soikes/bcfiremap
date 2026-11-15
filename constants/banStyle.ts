import type { ExpressionSpecification } from 'maplibre-gl';
import { BanLevel, BanType } from '../types/ban';

/** Map fill/outline colors and the solid card color for a ban that is in force (red) and one that is not (grey). */
export const STATUS_COLORS = {
  active:   { fill: 'rgba(220,50,50,0.08)',   stroke: 'rgba(220,50,50,0.65)',   solid: '#dc3232' },
  inactive: { fill: 'rgba(120,120,120,0.08)', stroke: 'rgba(120,120,120,0.65)', solid: '#757575' },
} as const;

/** Human-readable label for each ban level. */
export const LEVEL_LABEL: Record<BanLevel, string> = {
  provincial:          'Provincial',
  'regional-district': 'Regional District',
  municipal:           'Municipal',
};

/** Human-readable label for each ban type. */
export const TYPE_LABEL: Record<BanType, string> = {
  'campfire':     'Campfire Ban',
  'open-burning': 'Open Burning Prohibition',
  'all-fires':    'All Fires Prohibited',
  'category2-3':  'Category 2 & 3 Burning Ban',
  'other':        'Fire Prohibition',
};

/** Builds a map expression that picks the red or grey STATUS_COLORS entry from a feature's `active` property. */
export const activeColor = (kind: 'fill' | 'stroke'): ExpressionSpecification => [
  'case',
  ['==', ['get', 'active'], true],
  STATUS_COLORS.active[kind],
  STATUS_COLORS.inactive[kind],
];
