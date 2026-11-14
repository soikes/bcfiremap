import { FireBan } from "../types/ban";

export interface Collector {
  id: string;
  name: string;
  coverage: string;
  attribution: string;
  refetchIntervalMs: bigint;
  collect: (signal?: AbortSignal) => Promise<FireBan[]>;
}
