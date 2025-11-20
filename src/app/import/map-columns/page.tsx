'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppHeader from '@/components/layout/AppHeader';
import type { CSVAnalysisResult, ColumnAnalysis } from '@/lib/column-analyzer';
import type { ColumnMapping } from '@/lib/mapping-templates';
import { CheckCircle2, AlertCircle, XCircle, ArrowLeft } from 'lucide-react';
import { saveTemplate } from '@/lib/mapping-templates';
import { parseCSVWithMapping, processTransactions } from '@/lib/csv-parser-helpers';
import type { ParsedTransaction } from '@/lib/import-types';

type FieldType = 'date' | 'amount' | 'description' | 'debit' | 'credit' | 'ignore';

export default function MapColumnsPage() {
  const router = useRouter();
  const [mappings, setMappings] = useState<Record<number, FieldType>>({});
  const [shouldSaveTemplate, setShouldSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CSVAnalysisResult | null>(null);
  const [sampleData, setSampleData] = useState<string[][]>([]);
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    // Load CSV data from sessionStorage
    const csvAnalysisStr = sessionStorage.getItem('csvAnalysis');
    const csvDataStr = sessionStorage.getItem('csvData');
    const fileNameStr = sessionStorage.getItem('csvFileName');

    if (!csvAnalysisStr || !csvDataStr || !fileNameStr) {
      // No data found, redirect back to import
      router.push('/import');
      return;
    }

    try {
      const analysisData = JSON.parse(csvAnalysisStr);
      const csvData = JSON.parse(csvDataStr);
      
      setAnalysis(analysisData);
      setSampleData(csvData.slice(0, 5));
      setFileName(fileNameStr);

      // Initialize mappings from analysis
      const initialMappings: Record<number, FieldType> = {};
      
      analysisData.columns.forEach((col: ColumnAnalysis) => {
        if (col.fieldType !== 'unknown' && col.confidence > 0.5) {
          initialMappings[col.columnIndex] = col.fieldType as FieldType;
        }
      });

      // Set required fields if detected
      if (analysisData.dateColumn !== null) {
        initialMappings[analysisData.dateColumn] = 'date';
      }
      if (analysisData.amountColumn !== null) {
        initialMappings[analysisData.amountColumn] = 'amount';
      }
      if (analysisData.descriptionColumn !== null) {
        initialMappings[analysisData.descriptionColumn] = 'description';
      }
      if (analysisData.debitColumn !== null) {
        initialMappings[analysisData.debitColumn] = 'debit';
      }
      if (analysisData.creditColumn !== null) {
        initialMappings[analysisData.creditColumn] = 'credit';
      }

      setMappings(initialMappings);
    } catch (err) {
      console.error('Error loading CSV data:', err);
      router.push('/import');
    }
  }, [router]);

  const handleMappingChange = (columnIndex: number, fieldType: FieldType) => {
    setMappings((prev) => {
      const newMappings = { ...prev };
      
      // Remove any existing mappings for this field type (only one column per field)
      if (fieldType !== 'ignore') {
        Object.keys(newMappings).forEach((key) => {
          const idx = parseInt(key);
          if (newMappings[idx] === fieldType && idx !== columnIndex) {
            delete newMappings[idx];
          }
        });
      }

      if (fieldType === 'ignore') {
        delete newMappings[columnIndex];
      } else {
        newMappings[columnIndex] = fieldType;
      }

      return newMappings;
    });
  };

  const handleCancel = () => {
    // Clear session storage and go back
    sessionStorage.removeItem('csvAnalysis');
    sessionStorage.removeItem('csvData');
    sessionStorage.removeItem('csvFileName');
    router.push('/import');
  };

  const handleConfirm = async () => {
    if (!analysis) return;

    const mapping: ColumnMapping = {
      dateColumn: findColumnForField('date'),
      amountColumn: findColumnForField('amount'),
      descriptionColumn: findColumnForField('description'),
      debitColumn: findColumnForField('debit'),
      creditColumn: findColumnForField('credit'),
      dateFormat: analysis.dateFormat,
      hasHeaders: analysis.hasHeaders,
    };

    // Validate required fields
    if (mapping.dateColumn === null || mapping.amountColumn === null || mapping.descriptionColumn === null) {
      setError('Please map Date, Amount, and Description columns before continuing.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get full CSV data from sessionStorage
      const csvDataStr = sessionStorage.getItem('csvData');
      if (!csvDataStr) {
        throw new Error('CSV data not found');
      }
      const csvData = JSON.parse(csvDataStr);

      // Parse CSV with the provided mapping
      const transactions = await parseCSVWithMapping(csvData, mapping, fileName);

      if (transactions.length === 0) {
        setError('No transactions found in the file');
        setIsProcessing(false);
        return;
      }

      // Save template if requested
      if (shouldSaveTemplate) {
        try {
          await saveTemplate({
            userId: '', // Will be set by API
            templateName: templateName || undefined,
            fingerprint: analysis.fingerprint,
            columnCount: analysis.columns.length,
            mapping,
          });
        } catch (err) {
          console.warn('Failed to save template:', err);
          // Non-critical error, continue with import
        }
      }

      // Check for duplicates and auto-categorize
      const processedTransactions = await processTransactions(transactions);

      // Store transactions in sessionStorage and navigate back
      sessionStorage.setItem('parsedTransactions', JSON.stringify(processedTransactions));
      sessionStorage.setItem('parsedFileName', fileName);
      
      // Clear CSV data
      sessionStorage.removeItem('csvAnalysis');
      sessionStorage.removeItem('csvData');
      sessionStorage.removeItem('csvFileName');

      // Navigate back to import page which will show the preview
      router.push('/import');
    } catch (err) {
      console.error('Error processing file with mapping:', err);
      setError(err instanceof Error ? err.message : 'Failed to process file');
      setIsProcessing(false);
    }
  };

  const findColumnForField = (fieldType: FieldType): number | null => {
    const entry = Object.entries(mappings).find(([_, type]) => type === fieldType);
    return entry ? parseInt(entry[0]) : null;
  };

  const getConfidenceBadge = (column: ColumnAnalysis) => {
    if (column.confidence >= 0.85) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="size-3 mr-1" />
          {Math.round(column.confidence * 100)}%
        </Badge>
      );
    } else if (column.confidence >= 0.5) {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
          <AlertCircle className="size-3 mr-1" />
          {Math.round(column.confidence * 100)}%
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-gray-400 text-gray-600 dark:text-gray-400">
          <XCircle className="size-3 mr-1" />
          {Math.round(column.confidence * 100)}%
        </Badge>
      );
    }
  };

  if (!analysis) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const previewRows = sampleData.slice(0, 3);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AppHeader title="Map CSV Columns" />
      
      <Card>
        <CardHeader>
          <CardTitle>Map CSV Columns</CardTitle>
          <CardDescription>
            Review the detected columns and adjust the mapping if needed. At minimum, you need to map Date, Amount, and Description columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Column</TableHead>
                  <TableHead className="w-[180px]">Field Type</TableHead>
                  <TableHead className="w-[120px]">Confidence</TableHead>
                  <TableHead>Sample Values</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.columns.map((column) => {
                  const currentMapping = mappings[column.columnIndex] || 'ignore';
                  
                  return (
                    <TableRow key={column.columnIndex}>
                      <TableCell className="font-medium">
                        {column.headerName}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentMapping}
                          onValueChange={(value) => handleMappingChange(column.columnIndex, value as FieldType)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ignore">Ignore</SelectItem>
                            <SelectItem value="date">Date {findColumnForField('date') === column.columnIndex && '✓'}</SelectItem>
                            <SelectItem value="amount">Amount {findColumnForField('amount') === column.columnIndex && '✓'}</SelectItem>
                            <SelectItem value="description">Description {findColumnForField('description') === column.columnIndex && '✓'}</SelectItem>
                            <SelectItem value="debit">Debit {findColumnForField('debit') === column.columnIndex && '✓'}</SelectItem>
                            <SelectItem value="credit">Credit {findColumnForField('credit') === column.columnIndex && '✓'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {getConfidenceBadge(column)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {previewRows.map((row, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground truncate max-w-[400px]">
                              {row[column.columnIndex] || '(empty)'}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="save-template"
              checked={shouldSaveTemplate}
              onCheckedChange={(checked) => setShouldSaveTemplate(checked === true)}
            />
            <Label htmlFor="save-template" className="cursor-pointer">
              Save this mapping as a template for future imports
            </Label>
          </div>

          {shouldSaveTemplate && (
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name (optional)</Label>
              <Input
                id="template-name"
                placeholder="e.g., Bank of America Checking"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Required fields:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li className={findColumnForField('date') !== null ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                Date {findColumnForField('date') !== null && '✓'}
              </li>
              <li className={findColumnForField('amount') !== null ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                Amount {findColumnForField('amount') !== null && '✓'}
              </li>
              <li className={findColumnForField('description') !== null ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                Description {findColumnForField('description') !== null && '✓'}
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
              <ArrowLeft className="size-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Continue Import'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

