'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CSVAnalysisResult, ColumnAnalysis } from '@/lib/column-analyzer';
import type { ColumnMapping } from '@/lib/mapping-templates';
import { CheckCircle2, AlertCircle, XCircle, ArrowLeft, Info } from 'lucide-react';
import { saveTemplate } from '@/lib/mapping-templates';
import { parseCSVWithMapping, processTransactions } from '@/lib/csv-parser-helpers';
import type { ParsedTransaction } from '@/lib/import-types';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import QueuedImportProcessingDialog from '@/components/import/QueuedImportProcessingDialog';

type FieldType = 'date' | 'amount' | 'description' | 'debit' | 'credit' | 'status' | 'ignore';

/**
 * Parse amount string to number (helper function)
 */
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;

  let cleaned = amountStr.trim();

  // Handle negative amounts in parentheses: (123.45)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }

  // Remove currency symbols and spaces
  cleaned = cleaned.replace(/[$,\s]/g, '');

  // Handle European format
  if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Detect amount sign convention from CSV data
 * Returns 'positive_is_income' if most amounts are negative (checking account style)
 * Returns 'positive_is_expense' if most amounts are positive (credit card style)
 */
function detectAmountSignConvention(
  data: string[][],
  amountColumn: number | null,
  hasHeaders: boolean
): 'positive_is_expense' | 'positive_is_income' {
  if (amountColumn === null) {
    return 'positive_is_expense'; // Default fallback
  }

  const startRow = hasHeaders ? 1 : 0;
  const sampleSize = Math.min(20, data.length - startRow); // Sample up to 20 rows
  let negativeCount = 0;
  let positiveCount = 0;
  let validAmounts = 0;

  for (let i = startRow; i < startRow + sampleSize && i < data.length; i++) {
    const row = data[i];
    if (!row || row.length <= amountColumn) continue;

    const amountStr = row[amountColumn]?.trim();
    if (!amountStr) continue;

    const amount = parseAmount(amountStr);
    if (amount === 0 || isNaN(amount)) continue;

    validAmounts++;
    if (amount < 0) {
      negativeCount++;
    } else {
      positiveCount++;
    }
  }

  // Need at least 3 valid amounts to make a determination
  if (validAmounts < 3) {
    return 'positive_is_expense'; // Default fallback
  }

  // If most amounts are negative, it's likely a checking account (negative = expense)
  // So convention should be positive_is_income (positive = income, negative = expense)
  if (negativeCount > positiveCount * 1.5) {
    return 'positive_is_income';
  }

  // Otherwise default to positive_is_expense (credit card style)
  return 'positive_is_expense';
}

export default function MapColumnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRemap = searchParams.get('remap') === 'true';
  const batchIdFromUrl = searchParams.get('batchId'); // Get batchId from URL for remap
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [mappings, setMappings] = useState<Record<number, FieldType>>({});
  const [shouldSaveTemplate, setShouldSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CSVAnalysisResult | null>(null);
  const [sampleData, setSampleData] = useState<string[][]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [transactionTypeColumn, setTransactionTypeColumn] = useState<number | null>(null);
  const [statusColumn, setStatusColumn] = useState<number | null>(null);
  const [amountSignConvention, setAmountSignConvention] = useState<'positive_is_expense' | 'positive_is_income' | 'separate_column' | 'separate_debit_credit'>('positive_is_expense');
  const [remapBatchId, setRemapBatchId] = useState<string | null>(null);
  const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
  const [currentTemplateName, setCurrentTemplateName] = useState<string | null>(null);
  const [showTemplateOptions, setShowTemplateOptions] = useState(false);
  const [templateSaveMode, setTemplateSaveMode] = useState<'none' | 'overwrite' | 'new'>('none');
  const [overwriteTemplateId, setOverwriteTemplateId] = useState<number | null>(null);
  const [deleteOldTemplate, setDeleteOldTemplate] = useState(false);
  const [isProcessingRemap, setIsProcessingRemap] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');

  useEffect(() => {
    // Check permissions - redirect if read-only user
    if (!permissionsLoading && !isEditor) {
      router.push('/import');
      return;
    }
  }, [isEditor, permissionsLoading, router]);

  useEffect(() => {
    // Load CSV data from sessionStorage or remap API
    const loadData = async () => {
      if (!permissionsLoading && !isEditor) {
        router.push('/import');
        return;
      }

      try {
        let analysisData: CSVAnalysisResult;
        let csvData: string[][];
        let fileNameStr: string;
        let currentMapping: ColumnMapping | null = null;
        let templateId: number | null = null;
        let templateName: string | null = null;
        let batchId: string | null = null;

        if (isRemap) {
          // Load from remap API - prefer batchId from URL, fallback to sessionStorage
          batchId = batchIdFromUrl || sessionStorage.getItem('remapBatchId');
          if (!batchId) {
            throw new Error('Remap batch ID not found. Please use the Re-map Fields button from the import batch review page.');
          }
          
          // Store batchId in sessionStorage for backward compatibility
          if (batchIdFromUrl) {
            sessionStorage.setItem('remapBatchId', batchId);
          }

          const response = await fetch(`/api/import/queue/${encodeURIComponent(batchId)}/remap`);
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('CSV data not available for this import. Re-mapping is only available for CSV files that were mapped during upload.');
            }
            const errorData = await response.json().catch(() => ({ error: 'Failed to load remap data' }));
            throw new Error(errorData.error || 'Failed to load remap data');
          }

          const remapData = await response.json();
          analysisData = remapData.csvAnalysis;
          csvData = remapData.csvData;
          fileNameStr = remapData.csvFileName;
          currentMapping = remapData.currentMapping || null;
          templateId = remapData.currentTemplateId || null;
          templateName = remapData.currentTemplateName || null;
          setRemapBatchId(batchId);
          setCurrentTemplateId(templateId);
          setCurrentTemplateName(templateName);
          
          // Store in sessionStorage for template dialog
          sessionStorage.setItem('csvData', JSON.stringify(csvData));
          sessionStorage.setItem('csvAnalysis', JSON.stringify(analysisData));
          sessionStorage.setItem('csvFileName', fileNameStr);
        } else {
          // Load from sessionStorage
          const csvAnalysisStr = sessionStorage.getItem('csvAnalysis');
          const csvDataStr = sessionStorage.getItem('csvData');
          fileNameStr = sessionStorage.getItem('csvFileName') || '';

          if (!csvAnalysisStr || !csvDataStr) {
            router.push('/import');
            return;
          }

          analysisData = JSON.parse(csvAnalysisStr);
          csvData = JSON.parse(csvDataStr);
        }

        // Validate data structure
        if (!analysisData || typeof analysisData !== 'object') {
          throw new Error('Invalid analysis data');
        }
        if (!Array.isArray(csvData)) {
          throw new Error('Invalid CSV data');
        }

        setAnalysis(analysisData);
        setSampleData(csvData.slice(0, 5));
        setFileName(fileNameStr);

        // Initialize mappings from current mapping or analysis
        const initialMappings: Record<number, FieldType> = {};

        if (currentMapping) {
          // Use existing mapping
          if (currentMapping.dateColumn !== null) initialMappings[currentMapping.dateColumn] = 'date';
          if (currentMapping.amountColumn !== null) initialMappings[currentMapping.amountColumn] = 'amount';
          if (currentMapping.descriptionColumn !== null) initialMappings[currentMapping.descriptionColumn] = 'description';
          if (currentMapping.debitColumn !== null) initialMappings[currentMapping.debitColumn] = 'debit';
          if (currentMapping.creditColumn !== null) initialMappings[currentMapping.creditColumn] = 'credit';
          setAmountSignConvention(currentMapping.amountSignConvention);
          setTransactionTypeColumn(currentMapping.transactionTypeColumn);
          setStatusColumn(currentMapping.statusColumn);
        } else {
          // Initialize from analysis
          if (Array.isArray(analysisData.columns)) {
            analysisData.columns.forEach((col: ColumnAnalysis) => {
              if (col && col.fieldType !== 'unknown' && col.confidence > 0.5) {
                initialMappings[col.columnIndex] = col.fieldType as FieldType;
              }
            });
          }

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

          // Detect amount sign convention
          if (analysisData.amountColumn !== null) {
            const detectedConvention = detectAmountSignConvention(
              csvData,
              analysisData.amountColumn,
              analysisData.hasHeaders
            );
            setAmountSignConvention(detectedConvention);
          }
        }

        setMappings(initialMappings);
      } catch (err) {
        console.error('Error loading CSV data:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to load CSV data');
        router.push('/import');
      }
    };

    loadData();
  }, [router, isRemap, permissionsLoading, isEditor]);

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
      transactionTypeColumn: amountSignConvention === 'separate_column' ? transactionTypeColumn : null,
      statusColumn: statusColumn,
      amountSignConvention,
      dateFormat: analysis.dateFormat,
      hasHeaders: analysis.hasHeaders,
    };

    // Validate required fields
    if (mapping.dateColumn === null || mapping.descriptionColumn === null) {
      setError('Please map Date and Description columns before continuing.');
      return;
    }

    // Validate amount/convention requirements
    if (amountSignConvention === 'separate_debit_credit') {
      if (mapping.debitColumn === null || mapping.creditColumn === null) {
        setError('For separate debit/credit columns, both Debit and Credit columns must be mapped.');
        return;
      }
    } else if (amountSignConvention === 'separate_column') {
      if (mapping.transactionTypeColumn === null) {
        setError('Please select a Transaction Type column when using separate column convention.');
        return;
      }
      if (mapping.amountColumn === null) {
        setError('Please map Amount column when using separate column convention.');
        return;
      }
    } else {
      // positive_is_expense or positive_is_income
      if (mapping.amountColumn === null) {
        setError('Please map Amount column.');
        return;
      }
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

      // Handle remap flow
      if (isRemap && remapBatchId) {
        // Show template options dialog if user wants to save template
        if (shouldSaveTemplate || templateSaveMode !== 'none') {
          // If no current template and user selected overwrite, default to new
          if (templateSaveMode === 'overwrite' && !currentTemplateId) {
            setTemplateSaveMode('new');
          }
          setShowTemplateOptions(true);
          setIsProcessing(false);
          return;
        }

        // Apply remap directly without saving template, then process client-side
        const remapResponse = await fetch(`/api/import/queue/${remapBatchId}/apply-remap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mapping,
            saveAsTemplate: false,
          }),
        });

        if (!remapResponse.ok) {
          const errorData = await remapResponse.json().catch(() => ({ error: 'Failed to apply remap' }));
          throw new Error(errorData.error || 'Failed to apply remap');
        }

        // Start client-side processing (same flow as template save)
        setIsProcessing(false); // Close the mapping dialog
        setIsProcessingRemap(true);
        setRemapBatchId(remapBatchId); // Update state with batchId
        setProcessingProgress(0);
        setProcessingStage('Loading queued transactions...');

        // Process transactions on client side (same flow as review button)
        try {
          // Fetch all queued imports for this batch
          const fetchResponse = await fetch(`/api/automatic-imports/queue?batchId=${encodeURIComponent(remapBatchId)}`);
          if (!fetchResponse.ok) {
            throw new Error('Failed to fetch batch transactions');
          }

          const fetchData = await fetchResponse.json();
          const queuedImports = fetchData.imports || [];

          if (queuedImports.length === 0) {
            throw new Error('No transactions found for this batch');
          }

          setProcessingProgress(10);
          setProcessingStage(`Found ${queuedImports.length} transaction${queuedImports.length !== 1 ? 's' : ''}. Converting format...`);

          // Convert queued imports to ParsedTransaction format
          const initialTransactions: ParsedTransaction[] = queuedImports.map((qi: any) => ({
            id: `queued-${qi.id}`,
            date: qi.transaction_date,
            description: qi.description,
            amount: qi.amount,
            transaction_type: qi.transaction_type,
            merchant: qi.merchant,
            suggestedCategory: qi.suggested_category_id || undefined,
            account_id: qi.target_account_id || undefined,
            credit_card_id: qi.target_credit_card_id || undefined,
            is_historical: qi.is_historical || false,
            tag_ids: qi.tag_ids || [],
            splits: [],
            status: 'pending' as const,
            isDuplicate: false,
            originalData: qi.original_data,
            hash: qi.hash || '',
          }));

          // Process transactions: check duplicates and auto-categorize
          setProcessingProgress(20);
          setProcessingStage('Processing transactions...');
          const updateProgress = (progress: number, stage: string) => {
            setProcessingProgress(progress);
            setProcessingStage(stage);
          };

          const processedTransactions = await processTransactions(
            initialTransactions,
            initialTransactions[0]?.account_id || undefined,
            initialTransactions[0]?.credit_card_id || undefined,
            true, // Skip AI categorization initially
            updateProgress
          );

          // Update queued imports in database with categorization results
          setProcessingProgress(95);
          setProcessingStage('Updating categorization results...');
          const updateResponse = await fetch('/api/automatic-imports/queue/update-categorization', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactions: processedTransactions }),
          });

          if (!updateResponse.ok) {
            console.warn('Failed to update queued imports with categorization results');
          }

          // Store processed transactions and batch info in sessionStorage
          sessionStorage.setItem('queuedBatchId', remapBatchId);
          sessionStorage.setItem('queuedProcessedTransactions', JSON.stringify(processedTransactions));
          
          // Store batch info
          const firstImport = queuedImports[0];
          const batchInfo = {
            setup_name: 'Manual Import',
            source_type: 'manual',
            target_account_name: null as string | null,
            is_credit_card: false,
            is_historical: false as boolean | 'mixed',
          };

          if (firstImport) {
            batchInfo.is_credit_card = !!firstImport.target_credit_card_id;
            const allHistorical = queuedImports.every((qi: any) => qi.is_historical === true);
            const someHistorical = queuedImports.some((qi: any) => qi.is_historical === true);
            batchInfo.is_historical = allHistorical ? true : someHistorical ? 'mixed' : false;

            // Fetch account/credit card name if mapped
            try {
              if (firstImport.target_account_id) {
                const accountResponse = await fetch(`/api/accounts/${firstImport.target_account_id}`);
                if (accountResponse.ok) {
                  const account = await accountResponse.json();
                  batchInfo.target_account_name = account.name;
                }
              } else if (firstImport.target_credit_card_id) {
                const cardResponse = await fetch(`/api/credit-cards/${firstImport.target_credit_card_id}`);
                if (cardResponse.ok) {
                  const card = await cardResponse.json();
                  batchInfo.target_account_name = card.name;
                }
              }
            } catch (err) {
              console.warn('Failed to fetch account/card name:', err);
            }
          }
          
          sessionStorage.setItem('queuedBatchInfo', JSON.stringify(batchInfo));

          setProcessingProgress(100);
          setProcessingStage('Processing complete!');

          // Clear remap-related sessionStorage
          sessionStorage.removeItem('remapBatchId');
          sessionStorage.removeItem('csvData');
          sessionStorage.removeItem('csvAnalysis');
          sessionStorage.removeItem('csvFileName');

          // Navigate to batch review page after a short delay
          setTimeout(() => {
            setIsProcessingRemap(false);
            window.location.href = `/imports/queue/${remapBatchId}`;
          }, 500);
        } catch (processError: any) {
          console.error('Error processing remapped transactions:', processError);
          setIsProcessingRemap(false);
          toast.error(processError.message || 'Failed to process remapped transactions');
        }
        return;
      }

      // Normal flow: queue transactions
      let savedTemplateId: number | undefined;
      let mappingName: string | undefined;
      if (shouldSaveTemplate) {
        try {
          const savedTemplate = await saveTemplate({
            userId: '', // Will be set by API
            templateName: templateName || undefined,
            fingerprint: analysis.fingerprint,
            columnCount: analysis.columns.length,
            mapping,
          });
          savedTemplateId = savedTemplate.id;
          mappingName = savedTemplate.templateName || templateName || 'Saved Template';
        } catch (err) {
          console.warn('Failed to save template:', err);
          // Non-critical error, continue with import
        }
      }
      
      // If no template was saved, generate automatic mapping name
      if (!mappingName) {
        const { generateAutomaticMappingName } = await import('@/lib/mapping-name-generator');
        mappingName = generateAutomaticMappingName(analysis, fileName);
      }

      // csvData is already parsed from sessionStorage above, use it directly
      // Queue transactions (NOT processed - let queue handle that)
      const queueResponse = await fetch('/api/import/queue-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions, // Raw parsed transactions, NOT processed
          fileName,
          csvData, // csvData is already parsed from sessionStorage above
          csvAnalysis: analysis,
          csvFingerprint: analysis.fingerprint,
          csvMappingTemplateId: savedTemplateId,
          csvMappingName: mappingName,
        }),
      });

      if (!queueResponse.ok) {
        const errorData = await queueResponse.json().catch(() => ({ error: 'Failed to queue import' }));
        throw new Error(errorData.error || 'Failed to queue import');
      }

      // Clear CSV data from sessionStorage
      sessionStorage.removeItem('csvAnalysis');
      sessionStorage.removeItem('csvData');
      sessionStorage.removeItem('csvFileName');
      sessionStorage.removeItem('remapBatchId');

      toast.success(`Queued ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} for review`);
      router.push('/imports/queue');
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

  // Generate preview transactions - try to get one income and one expense
  const getPreviewTransactions = () => {
    if (!analysis || sampleData.length === 0) return [];

    const mapping: ColumnMapping = {
      dateColumn: findColumnForField('date'),
      amountColumn: findColumnForField('amount'),
      descriptionColumn: findColumnForField('description'),
      debitColumn: findColumnForField('debit'),
      creditColumn: findColumnForField('credit'),
      transactionTypeColumn: amountSignConvention === 'separate_column' ? transactionTypeColumn : null,
      statusColumn: statusColumn,
      amountSignConvention,
      dateFormat: analysis.dateFormat,
      hasHeaders: analysis.hasHeaders,
    };

    const startRow = analysis.hasHeaders ? 1 : 0;
    const previews: Array<{
      date: string;
      description: string;
      amount: string;
      amountValue: number;
      transactionType: 'income' | 'expense';
      isValid: boolean;
    }> = [];

    // Helper function to parse a single row
    const parseRow = (dataRow: string[]) => {
      const dateValue = mapping.dateColumn !== null ? dataRow[mapping.dateColumn] : null;
      const descriptionValue = mapping.descriptionColumn !== null ? dataRow[mapping.descriptionColumn] : null;
      
      let amount = 0;
      let transactionType: 'income' | 'expense' = 'expense';
      let amountDisplay = '';

      if (amountSignConvention === 'separate_debit_credit') {
        const debitValue = mapping.debitColumn !== null ? dataRow[mapping.debitColumn] : '';
        const creditValue = mapping.creditColumn !== null ? dataRow[mapping.creditColumn] : '';
        const debitAmount = parseAmount(debitValue);
        const creditAmount = parseAmount(creditValue);
        
        if (debitAmount > 0) {
          amount = debitAmount;
          transactionType = 'expense';
          amountDisplay = `Debit: ${debitValue}`;
        } else if (creditAmount > 0) {
          amount = creditAmount;
          transactionType = 'income';
          amountDisplay = `Credit: ${creditValue}`;
        } else {
          amountDisplay = 'No amount';
        }
      } else if (amountSignConvention === 'separate_column') {
        const amountValue = mapping.amountColumn !== null ? dataRow[mapping.amountColumn] : '';
        const typeValue = mapping.transactionTypeColumn !== null ? dataRow[mapping.transactionTypeColumn] : '';
        amount = parseAmount(amountValue);
        
        if (amount > 0) {
          // Determine type from column value
          const typeStr = (typeValue || '').toUpperCase();
          if (typeStr.includes('INCOME') || typeStr.includes('CREDIT') || typeStr.includes('DEPOSIT')) {
            transactionType = 'income';
          } else {
            transactionType = 'expense';
          }
          amountDisplay = `${amountValue} (${typeValue || 'N/A'})`;
        } else {
          amountDisplay = 'No amount';
        }
      } else {
        const amountValue = mapping.amountColumn !== null ? dataRow[mapping.amountColumn] : '';
        amount = parseAmount(amountValue);
        
        if (amount !== 0) {
          if (amountSignConvention === 'positive_is_income') {
            transactionType = amount > 0 ? 'income' : 'expense';
          } else {
            transactionType = amount > 0 ? 'expense' : 'income';
          }
          amountDisplay = amountValue;
        } else {
          amountDisplay = 'No amount';
        }
      }

      return {
        date: dateValue || 'Not mapped',
        description: descriptionValue || 'Not mapped',
        amount: amountDisplay,
        amountValue: amount,
        transactionType,
        isValid: !!(dateValue && descriptionValue && amount !== 0),
      };
    };

    // Try to find one income and one expense
    let incomeFound = false;
    let expenseFound = false;

    for (let i = startRow; i < sampleData.length && previews.length < 2; i++) {
      const dataRow = sampleData[i];
      if (!dataRow) continue;

      const preview = parseRow(dataRow);
      
      // Skip invalid rows
      if (!preview.isValid) continue;

      // If we haven't found an income yet and this is income, add it
      if (!incomeFound && preview.transactionType === 'income') {
        previews.push(preview);
        incomeFound = true;
      }
      // If we haven't found an expense yet and this is expense, add it
      else if (!expenseFound && preview.transactionType === 'expense') {
        previews.push(preview);
        expenseFound = true;
      }
      // If we've found both types, we're done
      else if (incomeFound && expenseFound) {
        break;
      }
      // If we haven't found both types and this is the first row, add it
      else if (previews.length === 0) {
        previews.push(preview);
        if (preview.transactionType === 'income') incomeFound = true;
        else expenseFound = true;
      }
    }

    // If we only found one type, try to get a second row of any type
    if (previews.length === 1) {
      for (let i = startRow; i < sampleData.length && previews.length < 2; i++) {
        const dataRow = sampleData[i];
        if (!dataRow) continue;

        const preview = parseRow(dataRow);
        
        // Skip invalid rows or rows we've already added
        if (!preview.isValid) continue;
        
        // Check if this row is different from what we already have
        const alreadyAdded = previews.some(p => 
          p.date === preview.date && 
          p.description === preview.description && 
          p.amountValue === preview.amountValue
        );
        
        if (!alreadyAdded) {
          previews.push(preview);
          break;
        }
      }
    }

    return previews;
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
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Map CSV Columns</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Map CSV Columns</CardTitle>
          <CardDescription>
            Review the detected columns and adjust the mapping if needed. At minimum, you need to map Date, Amount, and Description columns.
          </CardDescription>
          {/* Show helpful message for API imports */}
          {(fileName.includes('Teller') || fileName.includes('Account Transactions')) && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">This is an automatic import from your bank account.</p>
                <p>The most important setting is the <strong>Amount Sign Convention</strong> below. If transactions are showing as the wrong type (income vs expense), adjust this setting.</p>
              </div>
            </div>
          )}
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

          {/* Transaction Type Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Type Configuration</CardTitle>
              <CardDescription>
                Configure how to determine if transactions are income or expense
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount-sign-convention">Amount Sign Convention</Label>
                <Select
                  value={amountSignConvention}
                  onValueChange={(value) => setAmountSignConvention(value as typeof amountSignConvention)}
                >
                  <SelectTrigger id="amount-sign-convention">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive_is_expense">Positive amounts are expenses (most common)</SelectItem>
                    <SelectItem value="positive_is_income">Positive amounts are income</SelectItem>
                    <SelectItem value="separate_column">Use separate transaction type column</SelectItem>
                    <SelectItem value="separate_debit_credit">Use separate debit and credit columns</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {amountSignConvention === 'separate_debit_credit' && 'Debit amounts = expenses, Credit amounts = income'}
                  {amountSignConvention === 'separate_column' && 'Select a column that contains "INCOME", "EXPENSE", "DEBIT", "CREDIT", etc.'}
                  {amountSignConvention === 'positive_is_expense' && 'Positive amounts are expenses, negative amounts are income'}
                  {amountSignConvention === 'positive_is_income' && 'Positive amounts are income, negative amounts are expenses'}
                </p>
              </div>

              {amountSignConvention === 'separate_column' && (
                <div>
                  <Label htmlFor="transaction-type-column">Transaction Type Column</Label>
                  <Select
                    value={transactionTypeColumn?.toString() || ''}
                    onValueChange={(value) => setTransactionTypeColumn(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger id="transaction-type-column">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {analysis.columns.map((col) => (
                        <SelectItem key={col.columnIndex} value={col.columnIndex.toString()}>
                          {col.headerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {amountSignConvention === 'separate_debit_credit' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Note:</strong> Both Debit and Credit columns must be mapped above. 
                    Debit amounts will be treated as expenses, Credit amounts as income.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Column Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Column (Optional)</CardTitle>
              <CardDescription>
                Map a column containing transaction status (e.g., "pending", "cleared", "posted") to automatically filter out pending transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status-column">Status Column</Label>
                <Select
                  value={statusColumn?.toString() || 'none'}
                  onValueChange={(value) => setStatusColumn(value === 'none' ? null : parseInt(value))}
                >
                  <SelectTrigger id="status-column">
                    <SelectValue placeholder="Select column (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (don't filter by status)</SelectItem>
                    {analysis.columns.map((col) => (
                      <SelectItem key={col.columnIndex} value={col.columnIndex.toString()}>
                        {col.headerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  If mapped, transactions with status "pending", "processing", "authorized", etc. will be automatically excluded from the import.
                  Transactions with status "posted", "cleared", "completed", etc. will be included.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Rows */}
          {(() => {
            const previews = getPreviewTransactions();
            if (previews.length === 0) return null;
            
            const hasInvalid = previews.some(p => !p.isValid);
            
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>
                    How transactions will appear with your current mappings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead className="whitespace-nowrap">Description</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                          <TableHead className="whitespace-nowrap">Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previews.map((preview, index) => (
                          <TableRow key={index}>
                            <TableCell className={`whitespace-nowrap text-xs ${preview.date === 'Not mapped' ? 'text-red-600 dark:text-red-400' : ''}`}>
                              {preview.date === 'Not mapped' ? (
                                <span className="italic text-muted-foreground">Not mapped</span>
                              ) : (
                                preview.date
                              )}
                            </TableCell>
                            <TableCell className={`font-medium text-sm max-w-[250px] truncate ${preview.description === 'Not mapped' ? 'text-red-600 dark:text-red-400' : ''}`}>
                              {preview.description === 'Not mapped' ? (
                                <span className="italic text-muted-foreground">Not mapped</span>
                              ) : (
                                preview.description
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-semibold text-sm whitespace-nowrap ${
                              preview.transactionType === 'income'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            } ${preview.amount === 'No amount' ? 'text-red-600 dark:text-red-400' : ''}`}>
                              {preview.amount === 'No amount' ? (
                                <span className="italic text-muted-foreground">Not mapped</span>
                              ) : preview.amount.includes('(') ? (
                                // Show full amount with type column value in parentheses
                                <span>
                                  {preview.transactionType === 'income' ? '+' : '-'}
                                  {formatCurrency(Math.abs(preview.amountValue))}
                                  {' '}
                                  <span className="text-xs text-muted-foreground">
                                    ({preview.amount.match(/\(([^)]+)\)/)?.[1] || ''})
                                  </span>
                                </span>
                              ) : preview.amount.includes('Debit:') || preview.amount.includes('Credit:') ? (
                                // Show debit/credit with formatted amount
                                <span>
                                  {preview.transactionType === 'income' ? '+' : '-'}
                                  {formatCurrency(Math.abs(preview.amountValue))}
                                </span>
                              ) : (
                                // Regular amount formatting
                                <>
                                  {preview.transactionType === 'income' ? '+' : '-'}
                                  {formatCurrency(Math.abs(preview.amountValue))}
                                </>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant={preview.transactionType === 'income' ? 'default' : 'secondary'} className="text-xs">
                                {preview.transactionType === 'income' ? 'Income' : 'Expense'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {hasInvalid && (
                    <div className="mt-4 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                      ⚠️ Some required fields are not mapped. Please map Date, Description, and Amount columns.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Only show this checkbox for non-remap flows */}
          {!isRemap && (
            <>
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
            </>
          )}

          {isRemap && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remap-save-template"
                  checked={templateSaveMode !== 'none'}
                  onCheckedChange={(checked) => setTemplateSaveMode(checked ? 'new' : 'none')}
                />
                <Label htmlFor="remap-save-template" className="cursor-pointer">
                  Save this mapping as a template
                </Label>
              </div>

              {templateSaveMode !== 'none' && (
                <div className="space-y-4 ml-6">
                  <div>
                    <Label>Save Option</Label>
                    <Select
                      value={templateSaveMode}
                      onValueChange={(value) => setTemplateSaveMode(value as typeof templateSaveMode)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentTemplateId && (
                          <SelectItem value="overwrite">Overwrite existing template</SelectItem>
                        )}
                        <SelectItem value="new">Create new template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {templateSaveMode === 'overwrite' && currentTemplateId && (
                    <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                      <p className="text-sm">
                        Will overwrite: <strong>{currentTemplateName || 'Current Template'}</strong>
                      </p>
                    </div>
                  )}

                  {templateSaveMode === 'new' && (
                    <>
                      <div>
                        <Label htmlFor="remap-template-name">Template Name</Label>
                        <Input
                          id="remap-template-name"
                          placeholder="e.g., Bank of America Checking (Updated)"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                        />
                      </div>
                      {currentTemplateId && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="delete-old-template"
                            checked={deleteOldTemplate}
                            onCheckedChange={(checked) => setDeleteOldTemplate(checked === true)}
                          />
                          <Label htmlFor="delete-old-template" className="cursor-pointer text-sm">
                            Delete old template: {currentTemplateName || 'Current Template'}
                          </Label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Required fields:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li className={findColumnForField('date') !== null ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                Date {findColumnForField('date') !== null && '✓'}
              </li>
              {(amountSignConvention !== 'separate_debit_credit' && (
                <li className={findColumnForField('amount') !== null ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  Amount {findColumnForField('amount') !== null && '✓'}
                </li>
              ))}
              {amountSignConvention === 'separate_debit_credit' && (
                <>
                  <li className={findColumnForField('debit') !== null ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    Debit Column {findColumnForField('debit') !== null && '✓'}
                  </li>
                  <li className={findColumnForField('credit') !== null ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    Credit Column {findColumnForField('credit') !== null && '✓'}
                  </li>
                </>
              )}
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
              {isProcessing ? 'Processing...' : isRemap ? 'Apply Re-mapping' : 'Continue Import'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Options Dialog for Remap */}
      <Dialog open={showTemplateOptions} onOpenChange={setShowTemplateOptions}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Template</DialogTitle>
            <DialogDescription>
              Choose how to save this mapping as a template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Save Option</Label>
              <Select
                value={templateSaveMode}
                onValueChange={(value) => setTemplateSaveMode(value as typeof templateSaveMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentTemplateId && (
                    <SelectItem value="overwrite">Overwrite existing template</SelectItem>
                  )}
                  <SelectItem value="new">Create new template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {templateSaveMode === 'overwrite' && currentTemplateId && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                <p className="text-sm">
                  Will overwrite: <strong>{currentTemplateName || 'Current Template'}</strong>
                </p>
              </div>
            )}

            {templateSaveMode === 'new' && (
              <>
                <div>
                  <Label htmlFor="dialog-template-name">Template Name</Label>
                  <Input
                    id="dialog-template-name"
                    placeholder="e.g., Bank of America Checking (Updated)"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                {currentTemplateId && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dialog-delete-old-template"
                      checked={deleteOldTemplate}
                      onCheckedChange={(checked) => setDeleteOldTemplate(checked === true)}
                    />
                    <Label htmlFor="dialog-delete-old-template" className="cursor-pointer text-sm">
                      Delete old template: {currentTemplateName || 'Current Template'}
                    </Label>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateOptions(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!analysis || !remapBatchId) return;

                setIsProcessing(true);
                setShowTemplateOptions(false);

                try {
                  // Get CSV data from sessionStorage (stored during remap load)
                  const csvDataStr = sessionStorage.getItem('csvData');
                  if (!csvDataStr) {
                    throw new Error('CSV data not found');
                  }
                  const csvData = JSON.parse(csvDataStr);
                  
                  // Get analysis from sessionStorage
                  const csvAnalysisStr = sessionStorage.getItem('csvAnalysis');
                  if (!csvAnalysisStr) {
                    throw new Error('CSV analysis not found');
                  }
                  const csvAnalysis = JSON.parse(csvAnalysisStr);

                  const mapping: ColumnMapping = {
                    dateColumn: findColumnForField('date'),
                    amountColumn: findColumnForField('amount'),
                    descriptionColumn: findColumnForField('description'),
                    debitColumn: findColumnForField('debit'),
                    creditColumn: findColumnForField('credit'),
                    transactionTypeColumn: amountSignConvention === 'separate_column' ? transactionTypeColumn : null,
                    statusColumn: statusColumn,
                    amountSignConvention,
                    dateFormat: analysis.dateFormat,
                    hasHeaders: analysis.hasHeaders,
                  };

                  // Generate mapping name if not saving template
                  let mappingNameForRemap: string | undefined;
                  if (templateSaveMode === 'new' && templateName) {
                    mappingNameForRemap = templateName;
                  } else if (templateSaveMode === 'overwrite' && currentTemplateName) {
                    mappingNameForRemap = currentTemplateName;
                  } else {
                    // Generate automatic name using analysis from sessionStorage
                    const { generateAutomaticMappingName } = await import('@/lib/mapping-name-generator');
                    const storedFileName = sessionStorage.getItem('csvFileName') || fileName || 'unknown.csv';
                    mappingNameForRemap = generateAutomaticMappingName(csvAnalysis, storedFileName);
                  }
                  
                  const remapResponse = await fetch(`/api/import/queue/${remapBatchId}/apply-remap`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      mapping,
                      saveAsTemplate: true,
                      templateName: templateSaveMode === 'new' ? (templateName || undefined) : undefined,
                      overwriteTemplateId: templateSaveMode === 'overwrite' ? (currentTemplateId || undefined) : undefined,
                      deleteOldTemplate: deleteOldTemplate,
                    }),
                  });

                  if (!remapResponse.ok) {
                    const errorData = await remapResponse.json().catch(() => ({ error: 'Failed to apply remap' }));
                    throw new Error(errorData.error || 'Failed to apply remap');
                  }

                  const remapResult = await remapResponse.json();
                  
                  // Close dialog and start client-side processing
                  setShowTemplateOptions(false);
                  setIsProcessingRemap(true);
                  setRemapBatchId(remapBatchId);
                  setProcessingProgress(0);
                  setProcessingStage('Loading queued transactions...');

                  // Process transactions on client side (same flow as review button)
                  try {
                    // Fetch all queued imports for this batch
                    const fetchResponse = await fetch(`/api/automatic-imports/queue?batchId=${encodeURIComponent(remapBatchId)}`);
                    if (!fetchResponse.ok) {
                      throw new Error('Failed to fetch batch transactions');
                    }

                    const fetchData = await fetchResponse.json();
                    const queuedImports = fetchData.imports || [];

                    if (queuedImports.length === 0) {
                      throw new Error('No transactions found for this batch');
                    }

                    setProcessingProgress(10);
                    setProcessingStage(`Found ${queuedImports.length} transaction${queuedImports.length !== 1 ? 's' : ''}. Converting format...`);

                    // Convert queued imports to ParsedTransaction format
                    const initialTransactions: ParsedTransaction[] = queuedImports.map((qi: any) => ({
                      id: `queued-${qi.id}`,
                      date: qi.transaction_date,
                      description: qi.description,
                      amount: qi.amount,
                      transaction_type: qi.transaction_type,
                      merchant: qi.merchant,
                      suggestedCategory: qi.suggested_category_id || undefined,
                      account_id: qi.target_account_id || undefined,
                      credit_card_id: qi.target_credit_card_id || undefined,
                      is_historical: qi.is_historical || false,
                      splits: [],
                      status: 'pending' as const,
                      isDuplicate: false,
                      originalData: qi.original_data,
                      hash: qi.hash || '',
                    }));

                    // Process transactions: check duplicates and auto-categorize
                    setProcessingProgress(20);
                    setProcessingStage('Processing transactions...');
                    const updateProgress = (progress: number, stage: string) => {
                      setProcessingProgress(progress);
                      setProcessingStage(stage);
                    };

                    const processedTransactions = await processTransactions(
                      initialTransactions,
                      initialTransactions[0]?.account_id || undefined,
                      initialTransactions[0]?.credit_card_id || undefined,
                      true, // Skip AI categorization initially
                      updateProgress
                    );

                    // Update queued imports in database with categorization results
                    setProcessingProgress(95);
                    setProcessingStage('Updating categorization results...');
                    const updateResponse = await fetch('/api/automatic-imports/queue/update-categorization', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ transactions: processedTransactions }),
                    });

                    if (!updateResponse.ok) {
                      console.warn('Failed to update queued imports with categorization results');
                    }

                    // Store processed transactions and batch info in sessionStorage
                    sessionStorage.setItem('queuedBatchId', remapBatchId);
                    sessionStorage.setItem('queuedProcessedTransactions', JSON.stringify(processedTransactions));
                    
                    // Store batch info
                    const firstImport = queuedImports[0];
                    const batchInfo = {
                      setup_name: 'Manual Import',
                      source_type: 'manual',
                      target_account_name: null as string | null,
                      is_credit_card: false,
                      is_historical: false as boolean | 'mixed',
                    };

                    if (firstImport) {
                      batchInfo.is_credit_card = !!firstImport.target_credit_card_id;
                      const allHistorical = queuedImports.every((qi: any) => qi.is_historical === true);
                      const someHistorical = queuedImports.some((qi: any) => qi.is_historical === true);
                      batchInfo.is_historical = allHistorical ? true : someHistorical ? 'mixed' : false;

                      // Fetch account/credit card name if mapped
                      try {
                        if (firstImport.target_account_id) {
                          const accountResponse = await fetch(`/api/accounts/${firstImport.target_account_id}`);
                          if (accountResponse.ok) {
                            const account = await accountResponse.json();
                            batchInfo.target_account_name = account.name;
                          }
                        } else if (firstImport.target_credit_card_id) {
                          const cardResponse = await fetch(`/api/credit-cards/${firstImport.target_credit_card_id}`);
                          if (cardResponse.ok) {
                            const card = await cardResponse.json();
                            batchInfo.target_account_name = card.name;
                          }
                        }
                      } catch (err) {
                        console.warn('Failed to fetch account/card name:', err);
                      }
                    }
                    
                    sessionStorage.setItem('queuedBatchInfo', JSON.stringify(batchInfo));

                    setProcessingProgress(100);
                    setProcessingStage('Processing complete!');

                    // Clear remap-related sessionStorage
                    sessionStorage.removeItem('remapBatchId');
                    sessionStorage.removeItem('csvData');
                    sessionStorage.removeItem('csvAnalysis');
                    sessionStorage.removeItem('csvFileName');

                    // Navigate to batch review page after a short delay
                    setTimeout(() => {
                      setIsProcessingRemap(false);
                      window.location.href = `/imports/queue/${remapBatchId}`;
                    }, 500);
                  } catch (processError: any) {
                    console.error('Error processing remapped transactions:', processError);
                    setIsProcessingRemap(false);
                    toast.error(processError.message || 'Failed to process remapped transactions');
                  }
                } catch (err) {
                  console.error('Error applying remap:', err);
                  setError(err instanceof Error ? err.message : 'Failed to apply remap');
                  setIsProcessing(false);
                }
              }}
            >
              Apply & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Dialog for Remap */}
      <QueuedImportProcessingDialog
        open={isProcessingRemap}
        progress={processingProgress}
        stage={processingStage}
      />
    </div>
  );
}


