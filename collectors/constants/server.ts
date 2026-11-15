import { Collector } from '../../types/collector';
import { oakBayCollector } from '../oakBay';
import { saanichCollector } from '../saanich';
import { esquimaltCollector } from '../esquimalt';
import { sidneyCollector } from '../sidney';
import { victoriaCollector } from '../victoria';
import { colwoodCollector } from '../colwood';
import { viewRoyalCollector } from '../viewRoyal';
import { metchosinCollector } from '../metchosin';
import { centralSaanichCollector } from '../centralSaanich';
import { langfordCollector } from '../langford';
import { sookeCollector } from '../sooke';

export const SERVER_COLLECTORS: Collector[] = [victoriaCollector, oakBayCollector, saanichCollector, esquimaltCollector, sidneyCollector,
  centralSaanichCollector, colwoodCollector, langfordCollector, metchosinCollector, sookeCollector, viewRoyalCollector];
