import { provincialCollector } from './provincial';
import { Collector } from './types';

export const COLLECTORS: Collector[] = [provincialCollector];

if (process.env.EXPO_PUBLIC_EXAMPLE_BANS === 'true') {
  COLLECTORS.push((require('./example') as typeof import('./example')).exampleCollector);
}
