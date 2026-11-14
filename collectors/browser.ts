import { provincialCollector } from './provincial';
import { Collector } from './types';

export const BROWSER_COLLECTORS: Collector[] = [provincialCollector];

if (process.env.PUBLIC_EXAMPLE_BANS === 'true') {
  BROWSER_COLLECTORS.push((require('./example') as typeof import('./example')).exampleCollector);
}
