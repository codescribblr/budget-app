import { pendingCheckCreate } from "@/lib/pending-checks";
import { getActiveAccountId } from "@/lib/account-context";
import { NextRequest, NextResponse } from 'next/server';
import { getAllPendingChecks, createPendingCheck } from '@/lib/supabase-queries';
import { checkWriteAccess } from '@/lib/api-helpers';

export async function GET() {
  try {
    const pendingChecks = await getAllPendingChecks();
    return NextResponse.json(pendingChecks);
  } catch (error: any) {
    console.error('Error fetching pending checks:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'No active account') {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to fetch pending checks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const parsed = pendingCheckCreate.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a description, a positive amount with at most two decimal places, and a valid type." }, { status: 400 });
    const { expectedBudgetId, ...body } = parsed.data;
    if (expectedBudgetId !== undefined && expectedBudgetId !== await getActiveAccountId()) return NextResponse.json({ error: "The active budget changed. Reload before saving.", code: "BUDGET_CHANGED" }, { status: 409 });
    const pendingCheck = await createPendingCheck(body);
    return NextResponse.json(pendingCheck, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pending check:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to create pending check' }, { status: 500 });
  }
}

