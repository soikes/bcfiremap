import { BanLevel, BanType } from '../data/fireBans';

/** Fill/stroke colors for each ban jurisdiction level. */
export const BAN_COLORS: Record<BanLevel, { fill: string; stroke: string }> = {
  provincial:          { fill: 'rgba(220,50,50,0.08)',  stroke: 'rgba(220,50,50,0.65)'  },
  'regional-district': { fill: 'rgba(220,140,20,0.08)', stroke: 'rgba(220,140,20,0.65)' },
  municipal:           { fill: 'rgba(50,100,220,0.08)', stroke: 'rgba(50,100,220,0.65)' },
};

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
};
