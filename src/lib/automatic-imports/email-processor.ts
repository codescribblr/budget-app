/**
 * Email Processor for Automatic Imports
 * Processes email attachments (PDF/CSV) and extracts transactions
 */

import { parseCSVFile } from '../csv-parser';
import { parsePDFFile } from '../pdf-parser';
import { queueTransactions } from './queue-manager';
import type { ParsedTransaction } from '../import-types';

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer | string;
}

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProcessEmailOptions {
  importSetupId: number;
  attachments: EmailAttachment[];
  sourceBatchId: string;
  isHistorical?: boolean;
  accountId?: number; // Optional: provide accountId for webhook contexts
  supabase?: SupabaseClient; // Optional: provide supabase client for webhook contexts
}

/**
 * Process email attachments and queue transactions
 */
export async function processEmailAttachments(options: ProcessEmailOptions): Promise<{
  processed: number;
  queued: number;
  errors: string[];
}> {
  const { importSetupId, attachments, sourceBatchId, isHistorical = false } = options;
  const errors: string[] = [];
  let totalQueued = 0;

  for (const attachment of attachments) {
    try {
      let transactions: ParsedTransaction[] = [];

      if (attachment.contentType === 'text/csv' || attachment.filename.endsWith('.csv')) {
        // Process CSV
        transactions = await processCSVAttachment(attachment);
      } else if (
        attachment.contentType === 'application/pdf' ||
        attachment.filename.endsWith('.pdf')
      ) {
        // Process PDF
        transactions = await processPDFAttachment(attachment);
      } else {
        errors.push(`Unsupported file type: ${attachment.filename} (${attachment.contentType})`);
        continue;
      }

      if (transactions.length === 0) {
        errors.push(`No transactions found in ${attachment.filename}`);
        continue;
      }

      // Queue transactions
      const queued = await queueTransactions({
        importSetupId,
        transactions,
        sourceBatchId,
        isHistorical,
        accountId: options.accountId,
        supabase: options.supabase,
      });

      totalQueued += queued;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Error processing ${attachment.filename}: ${errorMessage}`);
      console.error(`Error processing attachment ${attachment.filename}:`, error);
    }
  }

  return {
    processed: attachments.length,
    queued: totalQueued,
    errors,
  };
}

/**
 * Process CSV attachment
 */
async function processCSVAttachment(attachment: EmailAttachment): Promise<ParsedTransaction[]> {
  // Convert content to File object for CSV parser
  // File API is available in Next.js API routes
  let buffer: Buffer | Uint8Array;
  if (typeof attachment.content === 'string') {
    buffer = Buffer.from(attachment.content, 'utf-8');
  } else {
    buffer = attachment.content;
  }
  
  // Convert Buffer to Uint8Array for Blob constructor
  // Create a new Uint8Array from buffer values to ensure proper type
  let uint8Array: Uint8Array;
  if (buffer instanceof Buffer) {
    // Create a new ArrayBuffer and copy buffer data
    const arrayBuffer = new ArrayBuffer(buffer.length);
    uint8Array = new Uint8Array(arrayBuffer);
    uint8Array.set(buffer);
  } else {
    uint8Array = buffer;
  }
  const blob = new Blob([uint8Array as BlobPart], { type: 'text/csv' });
  const file = new File([blob], attachment.filename, { type: 'text/csv' });

  const result = await parseCSVFile(file, { skipTemplate: false });
  return result.transactions;
}

/**
 * Process PDF attachment
 */
async function processPDFAttachment(attachment: EmailAttachment): Promise<ParsedTransaction[]> {
  // Convert content to File object for PDF parser
  // File API is available in Next.js API routes
  let buffer: Buffer | Uint8Array;
  if (typeof attachment.content === 'string') {
    buffer = Buffer.from(attachment.content, 'base64'); // PDFs are typically base64 encoded
  } else {
    buffer = attachment.content;
  }
  
  // Convert Buffer to Uint8Array for Blob constructor
  // Create a new Uint8Array from buffer values to ensure proper type
  let uint8Array: Uint8Array;
  if (buffer instanceof Buffer) {
    // Create a new ArrayBuffer and copy buffer data
    const arrayBuffer = new ArrayBuffer(buffer.length);
    uint8Array = new Uint8Array(arrayBuffer);
    uint8Array.set(buffer);
  } else {
    uint8Array = buffer;
  }
  const blob = new Blob([uint8Array as BlobPart], { type: 'application/pdf' });
  const file = new File([blob], attachment.filename, { type: 'application/pdf' });

  const result = await parsePDFFile(file);
  return result.transactions;
}
