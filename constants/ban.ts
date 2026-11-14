/** Every jurisdiction level a ban can have, broadest first. */
export const BAN_LEVELS = ['provincial', 'regional-district', 'municipal'] as const;

/** Every kind of prohibition a ban can be. */
export const BAN_TYPES = ['campfire', 'open-burning', 'all-fires', 'category2-3', 'other'] as const;
