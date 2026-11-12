import { exampleCollector } from './example';
import { provincialCollector } from './provincial';
import { Collector } from './types';

const INCLUDE_EXAMPLES = process.env.EXPO_PUBLIC_EXAMPLE_BANS === 'true';

export const COLLECTORS: Collector[] = INCLUDE_EXAMPLES
  ? [provincialCollector, exampleCollector]
  : [provincialCollector];
