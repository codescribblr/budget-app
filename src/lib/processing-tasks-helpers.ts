/**
 * Helper function to mark a processing task as complete via API
 * This is a client-safe wrapper that calls the API endpoint
 */
export async function markTaskCompleteForBatch(
  batchId: string,
  task: string
): Promise<void> {
  try {
    // Call the API endpoint to mark task complete
    const response = await fetch(`/api/import/queue/${encodeURIComponent(batchId)}/mark-task-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });

    if (!response.ok) {
      throw new Error(`Failed to mark task complete: ${response.statusText}`);
    }
  } catch (error) {
    // Log but don't throw - task completion tracking is not critical
    console.warn('Failed to mark task complete for batch:', error);
  }
}

