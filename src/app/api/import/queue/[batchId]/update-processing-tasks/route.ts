import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * POST /api/import/queue/[batchId]/update-processing-tasks
 * Update processing tasks completion status for a batch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { supabase } = await getAuthenticatedUser();
    
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { batchId } = await params;
    const body = await request.json();
    const { processingTasks } = body as {
      processingTasks: Record<string, boolean>;
    };

    if (!processingTasks) {
      return NextResponse.json(
        { error: 'processingTasks is required' },
        { status: 400 }
      );
    }

    const allowed = ["pdf_to_csv","csv_mapping","duplicate_detection","categorization","import_defaults_assignment"] as const;
    if(typeof processingTasks !== "object" || Array.isArray(processingTasks) || Object.keys(processingTasks).some(k=>!allowed.includes(k as typeof allowed[number]))) return NextResponse.json({error:"Invalid processing steps"},{status:400});
    const {persistCompletedTasks} = await import("@/lib/processing-tasks-server");
    await persistCompletedTasks(supabase,accountId,batchId,allowed.filter(k=>processingTasks[k]===true));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating processing tasks:', error);
    return NextResponse.json(
      { error: 'Failed to update processing tasks', message: error.message },
      { status: 500 }
    );
  }
}

