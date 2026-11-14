import { Collector } from '../../types/collector';
import { oakBayCollector } from '../oakBay';
import { saanichCollector } from '../saanich';
import { esquimaltCollector } from '../esquimalt';
import { sidneyCollector } from '../sidney';
import { victoriaCollector } from '../victoria';

export const SERVER_COLLECTORS: Collector[] = [victoriaCollector, oakBayCollector, saanichCollector, esquimaltCollector, sidneyCollector];
