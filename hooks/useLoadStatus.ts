import { useEffect, useRef, useState } from 'react';
import { SourceStatus } from '../types/api';
import { logger } from '../utils/logger';
import { useTimedMessage } from './useTimedMessage';

export const LOAD_TIMEOUT_MS = 30000;
export const MESSAGE_MS = 6000;
export const LOAD_FAILED_MESSAGE = "Some ban data didn't load, so the map may be missing bans.";

interface Options {
  timeoutMs?: number;
  messageMs?: number;
}

/** Says whether ban data is loading, stopping after `timeoutMs`, and, once loading is over, returns a message for a few seconds if any source has no data because it failed or timed out (not again until the set of such sources changes). */
export function useLoadStatus(
  sources: SourceStatus[],
  { timeoutMs = LOAD_TIMEOUT_MS, messageMs = MESSAGE_MS }: Options = {},
): { loading: boolean; message: string | null } {
  const busy = sources.some(source => source.status === 'pending');
  const [timedOut, setTimedOut] = useState(false);
  const [message, setMessage] = useTimedMessage(messageMs);
  const announced = useRef('');

  useEffect(() => {
    if (!busy) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      logger.log('[useLoadStatus] loading timed out after', timeoutMs, 'ms');
      setTimedOut(true);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [busy, timeoutMs]);

  const loading = busy && !timedOut;
  const missing = loading
    ? ''
    : sources
        .filter(source => source.status !== 'success')
        .map(source => source.id)
        .join(',');

  useEffect(() => {
    if (loading || missing === announced.current) return;
    announced.current = missing;
    if (missing) {
      logger.log('[useLoadStatus] ban data missing from', missing);
      setMessage(LOAD_FAILED_MESSAGE);
    }
  }, [loading, missing, setMessage]);

  return { loading, message };
}
