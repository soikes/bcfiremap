import { Collector } from '../../types/collector';
import { oakBayCollector } from '../oakBay';
import { victoriaCollector } from '../victoria';

export const SERVER_COLLECTORS: Collector[] = [victoriaCollector, oakBayCollector];
