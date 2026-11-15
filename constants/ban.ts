/** Every jurisdiction level a ban can have, broadest first. */
export const BAN_LEVELS = ['provincial', 'regional-district', 'municipal'] as const;

/** Every activity a ban can regulate. */
export const ACTIVITIES = [
  'campfire',
  'beach-fire',
  'backyard-burning',
  'open-burning',
  'all-fires',
  'category2-3',
  'other',
] as const;

/** Every permission an activity can have, strictest first. */
export const PERMISSIONS = ['prohibited', 'by-permit-only', 'allowed'] as const;
