'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import type { CSVAnalysisResult, ColumnAnalysis } from '@/lib/column-analyzer';
import type { ColumnMapping } from '@/lib/mapping-templates';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: CSVAnalysisResult;
  sampleData: string[][];
  onConfirm: (mapping: ColumnMapping, saveTemplate: boolean, templateName?: string) => void;
}

type FieldType = 'date' | 'amount' | 'description' | 'debit' | 'credit' | 'status' | 'ignore';

export default function ColumnMappingDialog({
  open,
  onOpenChange,
  analysis,
  sampleData,
  onConfirm,
}: ColumnMappingDialogProps) {
  const [mappings, setMappings] = useState<Record<number, FieldType>>({});
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Initialize mappings from analysis
  useEffect(() => {
    if (!open) return;

    const initialMappings: Record<number, FieldType> = {};
    
    analysis.columns.forEach((col) => {
      if (col.fieldType !== 'unknown' && col.confidence > 0.5) {
        initialMappings[col.columnIndex] = col.fieldType as FieldType;
      }
    });

    // Set required fields if detected
    if (analysis.dateColumn !== null) {
      initialMappings[analysis.dateColumn] = 'date';
    }
    if (analysis.amountColumn !== null) {
      initialMappings[analysis.amountColumn] = 'amount';
    }
    if (analysis.descriptionColumn !== null) {
      initialMappings[analysis.descriptionColumn] = 'description';
    }
    if (analysis.debitColumn !== null) {
      initialMappings[analysis.debitColumn] = 'debit';
    }
    if (analysis.creditColumn !== null) {
      initialMappings[analysis.creditColumn] = 'credit';
    }

    setMappings(initialMappings);
    setSaveTemplate(false);
    setTemplateName('');
  }, [open, analysis]);

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

  const handleConfirm = () => {
    const mapping: ColumnMapping = {
      dateColumn: findColumnForField('date'),
      amountColumn: findColumnForField('amount'),
      descriptionColumn: findColumnForField('description'),
      debitColumn: findColumnForField('debit'),
      creditColumn: findColumnForField('credit'),
      transactionTypeColumn: null,
      statusColumn: findColumnForField('status'),
      amountSignConvention: 'positive_is_expense',
      dateFormat: analysis.dateFormat,
      hasHeaders: analysis.hasHeaders,
    };

    // Validate required fields
    if (mapping.dateColumn === null || mapping.amountColumn === null || mapping.descriptionColumn === null) {
      alert('Please map Date, Amount, and Description columns before continuing.');
      return;
    }

    onConfirm(mapping, saveTemplate, saveTemplate ? templateName : undefined);
    onOpenChange(false);
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

  const previewRows = sampleData.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map CSV Columns</DialogTitle>
          <DialogDescription>
            Review the detected columns and adjust the mapping if needed. At minimum, you need to map Date, Amount, and Description columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Column</TableHead>
                  <TableHead className="w-[180px]">Field Type</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Sample Values</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.columns.map((column) => {
                  const currentMapping = mappings[column.columnIndex] || 'ignore';
                  const isRequired = ['date', 'amount', 'description'].includes(currentMapping);
                  
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
                            <SelectItem value="status">Status {findColumnForField('status') === column.columnIndex && '✓'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {getConfidenceBadge(column)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {previewRows.map((row, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground truncate max-w-[300px]">
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
              checked={saveTemplate}
              onCheckedChange={(checked) => setSaveTemplate(checked === true)}
            />
            <Label htmlFor="save-template" className="cursor-pointer">
              Save this mapping as a template for future imports
            </Label>
          </div>

          {saveTemplate && (
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Continue Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


