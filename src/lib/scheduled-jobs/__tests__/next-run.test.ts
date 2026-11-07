import { describe,it,expect } from 'vitest';
import { nextScheduledRun } from '../next-run';
import { cronAuthorization } from '../cron-auth';
describe('cron contract',()=>{
 it('fails closed without a secret, when disabled, or with the wrong header',()=>{
  expect(cronAuthorization(null,{})).toBe(503);expect(cronAuthorization('Bearer secret',{CRON_SECRET:'secret',SCHEDULED_JOBS_ENABLED:'false'})).toBe(503);
  expect(cronAuthorization(null,{CRON_SECRET:'secret'})).toBe(401);expect(cronAuthorization('Bearer secret',{CRON_SECRET:'secret'})).toBe(200);
 });
 it('uses UTC around DST and month ends',()=>{
  expect(nextScheduledRun('0 8 * * *',new Date('2026-11-01T07:59:59Z')).toISOString()).toBe('2026-11-01T08:00:00.000Z');
  expect(nextScheduledRun('0 8 * * *',new Date('2026-11-01T08:00:00Z')).toISOString()).toBe('2026-11-02T08:00:00.000Z');
  expect(nextScheduledRun('0 9 1 * *',new Date('2026-01-31T23:59:59Z')).toISOString()).toBe('2026-02-01T09:00:00.000Z');
  expect(nextScheduledRun('0 8 * * 1',new Date('2026-11-02T08:00:00Z')).toISOString()).toBe('2026-11-09T08:00:00.000Z');
 });
 it('rejects unsupported schedules instead of silently changing timing',()=>{expect(()=>nextScheduledRun('wrong')).toThrow();expect(()=>nextScheduledRun('99 8 * * *')).toThrow()});
});
