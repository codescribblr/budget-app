import { NextResponse } from 'next/server';
import { parsePDFFile } from '@/lib/pdf-parser';
import { checkWriteAccess } from '@/lib/api-helpers';

export async function POST(request: Request) {
  // Suppress Buffer deprecation warning from pdf-parse library dependencies
  // The warning comes from pdf.js (a dependency of pdf-parse) and is harmless
  const warningListener = (warning: Error & { code?: string }) => {
    if (warning.name === 'DeprecationWarning' && 
        (warning.message?.includes('Buffer() is deprecated') || warning.code === 'DEP0005')) {
      return; // Suppress Buffer deprecation warnings
    }
  };
  process.on('warning', warningListener);

  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if it's a PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Parse PDF
    const result = await parsePDFFile(file);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to parse PDF',
          canFallbackToAI: true, // Allow fallback to OpenAI if parsing fails
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      transactions: result.transactions,
      success: true,
      parsedCount: result.transactions.length,
    });
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process PDF',
        canFallbackToAI: true,
        debugMode: true,
      },
      { status: 500 }
    );
  } finally {
    // Remove warning listener
    process.removeListener('warning', warningListener);
  }
}


