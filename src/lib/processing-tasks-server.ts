/** Server-only persistence for import checkpoints. Failures must reach the caller. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { markTasksComplete, type ProcessingTask } from "./processing-tasks";

export async function persistCompletedTasks(
  supabase: SupabaseClient,
  accountId: number,
  batchId: string,
  tasks: ProcessingTask[],
): Promise<void> {
  // Compare-and-set prevents simultaneous step updates from erasing one another.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: first, error } = await supabase
      .from("queued_imports")
      .select("id, processing_tasks")
      .eq("account_id", accountId)
      .eq("source_batch_id", batchId)
      .order("id", { ascending: true })
      .limit(1)
      .single();
    if (error || !first)
      throw new Error("Could not load saved import progress.");
    const updated = markTasksComplete(first.processing_tasks || {}, tasks);
    let query = supabase
      .from("queued_imports")
      .update({ processing_tasks: updated })
      .eq("id", first.id)
      .eq("account_id", accountId);
    query =
      first.processing_tasks === null
        ? query.is("processing_tasks", null)
        : query.eq("processing_tasks", JSON.stringify(first.processing_tasks));
    const result = await query.select("id");
    if (result.error) throw new Error("Could not save import progress.");
    if (result.data?.length) return;
  }
  throw new Error("Import progress changed in another tab. Please retry.");
}

export async function markTaskCompleteForBatchServer(
  batchId: string,
  task: ProcessingTask,
): Promise<void> {
  const { getAuthenticatedUser } = await import("@/lib/supabase-queries");
  const { getActiveAccountId } = await import("@/lib/account-context");
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error("No active account");
  await persistCompletedTasks(supabase, accountId, batchId, [task]);
}
