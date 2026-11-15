import type { ExpressionSpecification } from 'maplibre-gl';
import { Activity, BanLevel, Permission } from '../types/ban';

/** How each permission looks: its label and icon, its map fill and outline, and the solid colour of its card text and side bar. By permit only and allowed with conditions share one yellow. */
export const PERMISSION_STYLE: Record<Permission, { label: string; icon: string; fill: string; stroke: string; solid: string }> = {
  prohibited:                { label: 'Prohibited',              icon: '✕',  fill: 'rgba(220,50,50,0.08)',  stroke: 'rgba(220,50,50,0.65)',  solid: '#dc3232' },
  'by-permit-only':          { label: 'By permit only',          icon: '✎',  fill: 'rgba(234,179,8,0.12)',  stroke: 'rgba(234,179,8,0.85)',  solid: '#a16207' },
  'allowed-with-conditions': { label: 'Allowed with conditions', icon: '!' , fill: 'rgba(234,179,8,0.12)',  stroke: 'rgba(234,179,8,0.85)',  solid: '#a16207' },
  allowed:                   { label: 'Allowed',                 icon: '✓',  fill: 'rgba(46,125,50,0.08)',  stroke: 'rgba(46,125,50,0.65)',  solid: '#2e7d32' },
};

/** Human-readable label for each ban level. */
export const LEVEL_LABEL: Record<BanLevel, string> = {
  provincial:          'Provincial',
  'regional-district': 'Regional District',
  municipal:           'Municipal',
};

/** Name of each activity, shown before its permission. */
export const ACTIVITY_LABEL: Record<Activity, string> = {
  'campfire':         'Campfires',
  'beach-fire':       'Beach fires',
  'backyard-burning': 'Backyard burning',
  'open-burning':     'Open burning',
  'all-fires':        'All open fires',
  'category2-3':      'Category 2 & 3 burning',
  'other':            'Fires',
};

/** Builds a map expression that picks the fill or outline colour of a feature's `permission` property. */
export const permissionColor = (kind: 'fill' | 'stroke'): ExpressionSpecification => [
  'match',
  ['get', 'permission'],
  'prohibited', PERMISSION_STYLE.prohibited[kind],
  'by-permit-only', PERMISSION_STYLE['by-permit-only'][kind],
  'allowed-with-conditions', PERMISSION_STYLE['allowed-with-conditions'][kind],
  PERMISSION_STYLE.allowed[kind],
];
