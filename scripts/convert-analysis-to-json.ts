#!/usr/bin/env tsx
/**
 * Helper script to convert markdown table analysis to JSON format
 * Usage: tsx scripts/convert-analysis-to-json.ts < markdown-table.txt
 */

import * as fs from 'fs';
import * as path from 'path';

function parseMarkdownTable(text: string): any[] {
  const lines = text.split('\n');
  const results: any[] = [];
  
  // Find the table header
  let headerLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('MerchantGroupId') && lines[i].includes('MerchantName')) {
      headerLineIndex = i;
      break;
    }
  }
  
  if (headerLineIndex === -1) {
    console.error('Could not find table header');
    return [];
  }
  
  // Parse header
  const headerLine = lines[headerLineIndex];
  const headers = headerLine.split('|').map(h => h.trim()).filter(h => h && !h.match(/^:[-:]+$/));
  
  console.log('Headers found:', headers);
  
  // Find data rows (skip separator line)
  for (let i = headerLineIndex + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.startsWith('|')) continue;
    
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < headers.length) continue;
    
    // Parse row data
    const row: any = {};
    headers.forEach((header, index) => {
      const value = cells[index]?.trim() || '';
      const headerKey = header.toLowerCase().replace(/\s+/g, '');
      
      // Map header names to our expected format
      if (headerKey.includes('merchantgroupid')) {
        row.merchantGroupId = parseInt(value) || null;
      } else if (headerKey.includes('merchantname')) {
        row.merchantName = value;
      } else if (headerKey.includes('isrecurring')) {
        row.isRecurring = value.toLowerCase() === 'true';
      } else if (headerKey.includes('frequency')) {
        row.frequency = value === 'null' || value === '' || value === 'irregular' ? null : value;
      } else if (headerKey.includes('confidence')) {
        row.confidence = value;
      } else if (headerKey.includes('reason')) {
        row.reason = value;
      } else if (headerKey.includes('shoulddetect')) {
        row.shouldDetect = value.toLowerCase() === 'true';
      }
    });
    
    if (row.merchantGroupId && row.merchantName) {
      results.push(row);
    }
  }
  
  return results;
}

// Read from stdin or file
const args = process.argv.slice(2);
let inputText: string;

if (args.length > 0) {
  // Read from file
  const filePath = args[0];
  inputText = fs.readFileSync(filePath, 'utf-8');
} else {
  // Read from stdin
  inputText = fs.readFileSync(0, 'utf-8');
}

const analysis = parseMarkdownTable(inputText);

console.log(JSON.stringify(analysis, null, 2));
console.error(`\nParsed ${analysis.length} merchants`);
