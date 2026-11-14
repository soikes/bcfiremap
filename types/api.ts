import { FireBan } from './ban';

export const LOAD_STATUSES = ['pending', 'success', 'error'] as const;

export type LoadStatus = (typeof LOAD_STATUSES)[number];

export interface SourceStatus {
  id: string;
  name: string;
  coverage: string;
  attribution: string;
  status: LoadStatus;
  hasData: boolean;
  retrying: boolean;
  updatedAt: number;
}

export interface BansResponse {
  bans: FireBan[];
  sources: SourceStatus[];
}
