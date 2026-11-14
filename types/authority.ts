import type { AUTHORITY_KINDS, GOVERNMENT_LEVELS } from '../constants/authority';

export type AuthorityKind = (typeof AUTHORITY_KINDS)[number];

export type GovernmentLevel = (typeof GOVERNMENT_LEVELS)[number];

/** A body that can issue fire bans. */
export interface Authority {
  id: string;
  name: string;
  kind: AuthorityKind;
  level: GovernmentLevel;
}
