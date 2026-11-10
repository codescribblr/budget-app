/** Supported application schedules are interpreted in UTC on every host. */
export function nextScheduledRun(schedule = '0 8 * * *', after = new Date()): Date {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) throw Error('Unsupported job schedule');
  const minute = Number(parts[0]), hour = Number(parts[1]);
  if (minute > 59 || hour > 23 || parts[3] !== '*') throw Error('Unsupported job schedule');
  const next = new Date(after);
  next.setUTCHours(hour, minute, 0, 0);
  if (parts[2] === '1' && parts[4] === '*') {
    next.setUTCDate(1);
    if (next <= after) return new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth() + 1, 1, hour, minute));
    return next;
  }
  if (parts[2] !== '*' || !/^(\*|[0-6])$/.test(parts[4])) throw Error('Unsupported job schedule');
  if (next <= after) next.setUTCDate(next.getUTCDate() + 1);
  if (parts[4] !== '*') while (next.getUTCDay() !== Number(parts[4])) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
