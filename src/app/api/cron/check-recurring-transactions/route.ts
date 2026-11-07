import { NextRequest } from 'next/server';
import { runJobsRequest } from '@/lib/scheduled-jobs/run-request';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
// Legacy aliases share the same atomic claims and only process due jobs.
export async function GET(request: NextRequest) { return runJobsRequest(request, 'check_recurring_transactions'); }
