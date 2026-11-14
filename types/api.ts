import { FireBan } from './ban';

export type LoadStatus = 'pending' | 'success' | 'error';

export interface SourceStatus {
  id: string;
  name: string;
  coverage: string;
  attribution: string;
  status: LoadStatus;
  hasData: boolean;
  updatedAt: number;
}

export interface BansResponse {
  bans: FireBan[];
  sources: SourceStatus[];
}
