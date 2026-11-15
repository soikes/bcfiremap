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

export const SAANICH_AUTHORITY: Authority = {
  id: 'saanich',
  name: 'District of Saanich',
  kind: 'municipality',
  level: 'municipal',
};

export const ESQUIMALT_AUTHORITY: Authority = {
  id: 'esquimalt',
  name: 'Township of Esquimalt',
  kind: 'municipality',
  level: 'municipal',
};

export const SIDNEY_AUTHORITY: Authority = {
  id: 'sidney',
  name: 'Town of Sidney',
  kind: 'municipality',
  level: 'municipal',
};

export const OAK_BAY_AUTHORITY: Authority = {
  id: 'oak-bay',
  name: 'District of Oak Bay',
  kind: 'municipality',
  level: 'municipal',
};

export const COLWOOD_AUTHORITY: Authority = {
  id: 'colwood',
  name: 'City of Colwood',
  kind: 'municipality',
  level: 'municipal',
};

export const VIEW_ROYAL_AUTHORITY: Authority = {
  id: 'view-royal',
  name: 'Town of View Royal',
  kind: 'municipality',
  level: 'municipal',
};

export const METCHOSIN_AUTHORITY: Authority = {
  id: 'metchosin',
  name: 'District of Metchosin',
  kind: 'municipality',
  level: 'municipal',
};

export const CENTRAL_SANICH_AUTHORITY: Authority = {
  id: 'central-saanich',
  name: 'District of Central Saanich',
  kind: 'municipality',
  level: 'municipal',
};

export const LANGFORD_AUTHORITY: Authority = {
  id: 'langford',
  name: 'City of Langford',
  kind: 'municipality',
  level: 'municipal',
};

export const SOOKE_AUTHORITY: Authority = {
  id: 'sooke',
  name: 'District of Sooke',
  kind: 'municipality',
  level: 'municipal',
};
