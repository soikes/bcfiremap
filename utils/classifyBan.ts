import { BanType } from '../types/ban';

/** Maps a source's free-text prohibition description to a BanType, falling back to 'other'. */
export function classifyBan(text: string): BanType {
  const t = text.toLowerCase();
  const campfire = /category\s*1|campfire/.test(t);
  const larger = /category\s*[23]/.test(t);
  if (/\ball\s+(open\s+)?(fires?|burning)\b/.test(t) || (campfire && larger)) return 'all-fires';
  if (larger) return 'category2-3';
  if (campfire) return 'campfire';
  if (/open\s+(fire|burning)/.test(t)) return 'open-burning';
  return 'other';
}
