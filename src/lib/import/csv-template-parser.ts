import { parseCSVWithMapping } from '../csv-parser-helpers';
import type { ParsedTransaction } from '../import-types';
import type { CSVImportTemplate } from '../mapping-templates';

/**
 * A saved template is only a shortcut for an upload. If it cannot read the
 * file, return null so the user can review the columns instead of rejecting it.
 */
export async function tryParseCSVWithTemplate(
  data: string[][],
  template: CSVImportTemplate,
  fileName: string
): Promise<ParsedTransaction[] | null> {
  try {
    const transactions = await parseCSVWithMapping(data, template.mapping, fileName);
    return transactions.length > 0 ? transactions : null;
  } catch (error) {
    console.warn('Saved CSV template could not parse the file:', error);
    return null;
  }
}
