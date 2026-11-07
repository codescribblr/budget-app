import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  pending: vi.fn(), claim: vi.fn(), renew: vi.fn(), finish: vi.fn(), expire: vi.fn(), failures: vi.fn(), handler: vi.fn(),
}));
vi.mock('../job-scheduler', () => ({ getPendingJobs: mocks.pending, claimJob: mocks.claim, renewJob: mocks.renew, finishJob: mocks.finish, expireJobLeases: mocks.expire, failedJobCount: mocks.failures }));
vi.mock('../job-handlers', () => ({ getJobHandler: () => mocks.handler }));
import { runJobsRequest } from '../run-request';
const job = { id: 1, job_type: 'proof', lease_token: 'token', metadata: {} };
const request = (secret = 'proof-secret') => new NextRequest('https://example.test/api/cron/run-jobs', { headers: { authorization: `Bearer ${secret}` } });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('CRON_SECRET', 'proof-secret'); vi.stubEnv('SCHEDULED_JOBS_ENABLED', 'true');
  mocks.pending.mockResolvedValue([job]); mocks.claim.mockResolvedValue(job); mocks.renew.mockResolvedValue(true);
  mocks.finish.mockResolvedValue(undefined); mocks.expire.mockResolvedValue(0); mocks.failures.mockResolvedValue(0);
  mocks.handler.mockResolvedValue({ success: true, message: 'done' });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('scheduled HTTP request contract', () => {
  it('does not touch the database for unauthorized requests', async () => {
    expect((await runJobsRequest(request('wrong'))).status).toBe(401); expect(mocks.pending).not.toHaveBeenCalled();
  });
  it('skips a row already claimed by another worker', async () => {
    mocks.claim.mockResolvedValue(null);
    const result = await runJobsRequest(request());
    expect(result.status).toBe(200); expect((await result.json()).processed).toBe(0); expect(mocks.handler).not.toHaveBeenCalled();
  });
  it('records a handler failure and returns failure to the panel', async () => {
    mocks.handler.mockResolvedValue({ success: false, error: 'partial provider failure' });
    const result = await runJobsRequest(request());
    expect(result.status).toBe(500); expect((await result.json()).success).toBe(false);
    expect(mocks.finish).toHaveBeenCalledWith(job, false, 'partial provider failure');
  });
  it('keeps unresolved historical failures visible even when no jobs are due', async () => {
    mocks.pending.mockResolvedValue([]); mocks.failures.mockResolvedValue(2);
    const result = await runJobsRequest(request()); expect(result.status).toBe(500); expect((await result.json()).failed).toBe(2);
  });
  it('fences completion when a heartbeat loses its lease', async () => {
    vi.useFakeTimers(); mocks.renew.mockResolvedValue(false);
    mocks.handler.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 61_000)));
    const pending = runJobsRequest(request()); await vi.advanceTimersByTimeAsync(61_000);
    expect((await pending).status).toBe(500); expect(mocks.finish).toHaveBeenCalledWith(job, false, expect.stringContaining('uncertain'));
  });
  it('returns a bounded infrastructure error without leaking database details', async () => {
    mocks.pending.mockRejectedValue(Error('private connection details'));
    const result = await runJobsRequest(request()); expect(result.status).toBe(503); expect(await result.text()).not.toContain('private connection');
  });
});
