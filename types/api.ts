import type { LOAD_STATUSES } from '../constants/api';
import { FireBan } from './ban';

export type LoadStatus = (typeof LOAD_STATUSES)[number];

export interface SourceStatus {
  id: string;
  name: string;
  coverage: string;
  attribution: string;
  status: LoadStatus;
  updatedAt: number;
}

export interface BansResponse {
  bans: FireBan[];
  sources: SourceStatus[];
}
