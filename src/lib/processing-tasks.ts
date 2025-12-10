/**
 * Processing Tasks Management
 * 
 * Tracks completion status of import processing tasks for queued imports.
 * This allows the system to resume processing from where it left off and
 * avoid re-running completed tasks.
 */

export type ProcessingTask = 
  | 'pdf_to_csv'
  | 'csv_mapping'
  | 'duplicate_detection'
  | 'categorization'
  | 'ai_categorization'
  | 'import_defaults_assignment'; // Combined: default account and historical flag

export interface ProcessingTasksStatus {
  pdf_to_csv?: boolean;
  csv_mapping?: boolean;
  duplicate_detection?: boolean;
  categorization?: boolean;
  ai_categorization?: boolean;
  import_defaults_assignment?: boolean; // Combined: default account and historical flag
}

/**
 * Initialize processing tasks for a new batch
 * @param sourceType - Type of import source ('manual', 'teller', 'email', etc.)
 * @param hasCsvData - Whether CSV data exists (indicates CSV file or PDF converted to CSV)
 * @param isPdf - Whether the source is a PDF file
 */
export function initializeProcessingTasks(
  sourceType: string,
  hasCsvData: boolean,
  isPdf: boolean = false
): ProcessingTasksStatus {
  const tasks: ProcessingTasksStatus = {};

  // PDF to CSV conversion (only for PDF files)
  if (isPdf) {
    tasks.pdf_to_csv = false;
  }

  // CSV mapping (always done if CSV data exists)
  if (hasCsvData) {
    tasks.csv_mapping = true; // Already done if CSV data exists
  }

  // All other tasks start as incomplete
  // Note: ai_categorization is not initialized here as it's only done manually
  tasks.duplicate_detection = false;
  tasks.categorization = false;
  tasks.import_defaults_assignment = false; // Combined: default account and historical flag

  return tasks;
}

/**
 * Reset processing tasks after re-mapping
 * Keeps csv_mapping as true (since re-mapping was just done)
 * Resets all other tasks to false
 */
export function resetTasksAfterRemap(currentTasks: ProcessingTasksStatus): ProcessingTasksStatus {
  return {
    ...currentTasks,
    csv_mapping: true, // Re-mapping was just completed
    duplicate_detection: false,
    categorization: false,
    ai_categorization: false,
    import_defaults_assignment: false, // Combined: default account and historical flag
  };
}

/**
 * Get list of incomplete tasks
 * Note: ai_categorization is excluded as it's only done manually on the review page
 */
export function getIncompleteTasks(tasks: ProcessingTasksStatus | null | undefined): ProcessingTask[] {
  if (!tasks) return [];

  const incomplete: ProcessingTask[] = [];
  
  if (tasks.pdf_to_csv === false) incomplete.push('pdf_to_csv');
  if (tasks.csv_mapping === false) incomplete.push('csv_mapping');
  if (tasks.duplicate_detection === false) incomplete.push('duplicate_detection');
  if (tasks.categorization === false) incomplete.push('categorization');
  // ai_categorization is excluded - only done manually on review page
  if (tasks.import_defaults_assignment === false) incomplete.push('import_defaults_assignment');

  return incomplete;
}

/**
 * Check if all required tasks are complete
 * Note: ai_categorization is excluded as it's only done manually on the review page
 */
export function areAllTasksComplete(tasks: ProcessingTasksStatus | null | undefined): boolean {
  if (!tasks) return false;
  
  // Check only tasks that are defined (some may not apply to all import types)
  // ai_categorization is excluded - it's only done manually on review page
  const requiredTasks: (keyof ProcessingTasksStatus)[] = [
    'duplicate_detection',
    'categorization',
    'import_defaults_assignment', // Combined: default account and historical flag
  ];

  // If csv_mapping is defined, it must be true
  if (tasks.csv_mapping !== undefined && tasks.csv_mapping === false) {
    return false;
  }

  // If pdf_to_csv is defined, it must be true
  if (tasks.pdf_to_csv !== undefined && tasks.pdf_to_csv === false) {
    return false;
  }

  // All required tasks must be true
  return requiredTasks.every(task => tasks[task] === true);
}

/**
 * Mark a task as complete
 */
export function markTaskComplete(
  tasks: ProcessingTasksStatus,
  task: ProcessingTask
): ProcessingTasksStatus {
  return {
    ...tasks,
    [task]: true,
  };
}

/**
 * Mark multiple tasks as complete
 */
export function markTasksComplete(
  tasks: ProcessingTasksStatus,
  completedTasks: ProcessingTask[]
): ProcessingTasksStatus {
  const updated = { ...tasks };
  completedTasks.forEach(task => {
    updated[task] = true;
  });
  return updated;
}

/**
 * Get human-readable task name
 */
export function getTaskName(task: ProcessingTask): string {
  const names: Record<ProcessingTask, string> = {
    pdf_to_csv: 'PDF to CSV Conversion',
    csv_mapping: 'CSV Column Mapping',
    duplicate_detection: 'Duplicate Detection',
    categorization: 'Rule-based Categorization',
    ai_categorization: 'AI Categorization',
    import_defaults_assignment: 'Import Defaults Assignment',
  };
  return names[task];
}
