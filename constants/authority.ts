import type { Authority } from '../types/authority';

/** Every kind of body that can issue a ban. */
export const AUTHORITY_KINDS = [
  'province-bcws',
  'regional-district',
  'municipality',
  'improvement-district',
  'bc-parks',
  'parks-canada',
  'first-nation',
  'land-manager',
] as const;

/** Every level of government an authority can sit at. */
export const GOVERNMENT_LEVELS = ['federal', 'provincial', 'regional', 'municipal', 'indigenous', 'local'] as const;

export const BCWS_AUTHORITY: Authority = {
  id: 'bcws',
  name: 'BC Wildfire Service',
  kind: 'province-bcws',
  level: 'provincial',
};

export const CRD_AUTHORITY: Authority = {
  id: 'crd',
  name: 'Capital Regional District',
  kind: 'regional-district',
  level: 'regional',
};

export const VICTORIA_AUTHORITY: Authority = {
  id: 'victoria',
  name: 'City of Victoria',
  kind: 'municipality',
  level: 'municipal',
};
