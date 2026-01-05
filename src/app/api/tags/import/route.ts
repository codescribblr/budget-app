import { NextRequest, NextResponse } from 'next/server';
import { createTag, getTags } from '@/lib/db/tags';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/tags/import
 * Import tags from CSV file
 */
export async function POST(request: NextRequest) {
  try {
    const writeCheck = await checkWriteAccess();
    if (writeCheck) return writeCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must have at least a header and one data row' }, { status: 400 });
    }

    // Parse CSV (simple parser - assumes quoted fields)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const header = parseCSVLine(lines[0]);
    const expectedColumns = ['Tag Name', 'Tag Color', 'Tag Description'];
    
    // Validate header
    if (!expectedColumns.every(col => header.includes(col))) {
      return NextResponse.json(
        { error: `CSV must have columns: ${expectedColumns.join(', ')}` },
        { status: 400 }
      );
    }

    const nameIndex = header.indexOf('Tag Name');
    const colorIndex = header.indexOf('Tag Color');
    const descriptionIndex = header.indexOf('Tag Description');

    const existingTags = await getTags();
    const tagMap = new Map(existingTags.map(t => [t.name.toLowerCase(), t]));
    const createdTags: string[] = [];
    const skippedTags: string[] = [];

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      if (row.length < expectedColumns.length) continue;

      const tagName = row[nameIndex]?.trim();
      if (!tagName) continue;

      const tagColor = row[colorIndex]?.trim() || null;
      const tagDescription = row[descriptionIndex]?.trim() || null;

      // Check if tag already exists (case-insensitive)
      const existingTag = tagMap.get(tagName.toLowerCase());
      if (existingTag) {
        skippedTags.push(tagName);
        continue;
      }

      try {
        // Tag names are automatically lowercased in createTag
        await createTag({
          name: tagName,
          color: tagColor || undefined,
          description: tagDescription || undefined,
        });
        createdTags.push(tagName.toLowerCase());
        tagMap.set(tagName.toLowerCase(), { name: tagName.toLowerCase() } as any);
      } catch (error: any) {
        console.error(`Error creating tag ${tagName}:`, error);
        skippedTags.push(tagName);
      }
    }

    return NextResponse.json({
      success: true,
      created: createdTags.length,
      skipped: skippedTags.length,
      createdTags,
      skippedTags: skippedTags.slice(0, 10), // Limit response size
    });
  } catch (error: any) {
    console.error('Error importing tags:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to import tags' },
      { status: 500 }
    );
  }
}

