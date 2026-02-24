'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import PreTaxDeductionsSection from './PreTaxDeductionsSection';
import type { IncomeStream, PayFrequency, PreTaxDeductionItem } from '@/lib/types';
import {
  calculateStreamMonthlyNet,
  calculateStreamPreTaxDeductions,
} from '@/lib/income-calculations';

interface IncomeStreamCardProps {
  stream: IncomeStream;
  onUpdate: (id: number, data: Partial<IncomeStream>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  disabled?: boolean;
  /** When true, edits are for scenario planning only - not persisted.*/
  scenarioMode?: boolean;
}

export default function IncomeStreamCard({
  stream,
  onUpdate,
  onDelete,
  disabled = false,
  scenarioMode = false,
}: IncomeStreamCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: stream.name,
    annual_income: stream.annual_income,
    tax_rate: stream.tax_rate,
    pay_frequency: stream.pay_frequency,
    include_extra_paychecks: stream.include_extra_paychecks,
    pre_tax_deduction_items: stream.pre_tax_deduction_items,
    include_in_budget: stream.include_in_budget,
  });

  const monthlyNet = calculateStreamMonthlyNet(stream);
  const preTaxDeductions = calculateStreamPreTaxDeductions(
    stream.pre_tax_deduction_items || [],
    stream.annual_income,
    stream.pay_frequency,
    stream.include_extra_paychecks
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onUpdate(stream.id, formData);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: stream.name,
      annual_income: stream.annual_income,
      tax_rate: stream.tax_rate,
      pay_frequency: stream.pay_frequency,
      include_extra_paychecks: stream.include_extra_paychecks,
      pre_tax_deduction_items: stream.pre_tax_deduction_items,
      include_in_budget: stream.include_in_budget,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const message = scenarioMode
      ? `Remove "${stream.name}" from scenario?`
      : `Delete "${stream.name}"?`;
    if (confirm(message)) {
      await onDelete(stream.id);
    }
  };

  return (
    <Card className={!stream.include_in_budget ? 'opacity-75' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{stream.name}</CardTitle>
            <CardDescription>
              {formatCurrency(monthlyNet)}/month net
              {!stream.include_in_budget && ' (excluded from budget)'}
            </CardDescription>
          </div>
          {!isEditing && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={disabled}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={disabled}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Primary Job"
                />
              </div>
              <div className="space-y-2">
                <Label>Annual Income</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.annual_income || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, annual_income: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (decimal)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.tax_rate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground">e.g., 0.2122 for 21.22%</p>
              </div>
              <div className="space-y-2">
                <Label>Pay Frequency</Label>
                <Select
                  value={formData.pay_frequency}
                  onValueChange={(v: PayFrequency) =>
                    setFormData({ ...formData, pay_frequency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly (52/year)</SelectItem>
                    <SelectItem value="bi-weekly">Bi-Weekly (26/year)</SelectItem>
                    <SelectItem value="semi-monthly">Semi-Monthly (24/year)</SelectItem>
                    <SelectItem value="monthly">Monthly (12/year)</SelectItem>
                    <SelectItem value="quarterly">Quarterly (4/year)</SelectItem>
                    <SelectItem value="annually">Annually (1/year)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.pay_frequency === 'bi-weekly' && (
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox
                    id={`include-extra-${stream.id}`}
                    checked={formData.include_extra_paychecks}
                    onCheckedChange={(c) =>
                      setFormData({ ...formData, include_extra_paychecks: c === true })
                    }
                  />
                  <Label htmlFor={`include-extra-${stream.id}`} className="cursor-pointer">
                    Include extra paychecks in budget (all 26 averaged over 12 months)
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox
                  id={`include-budget-${stream.id}`}
                  checked={formData.include_in_budget}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, include_in_budget: c === true })
                  }
                />
                <Label htmlFor={`include-budget-${stream.id}`} className="cursor-pointer">
                  Include in budget calculations
                </Label>
              </div>
            </div>

            <PreTaxDeductionsSection
              items={formData.pre_tax_deduction_items || []}
              annualIncome={formData.annual_income}
              payFrequency={formData.pay_frequency}
              includeExtraPaychecks={formData.include_extra_paychecks}
              onChange={(items) =>
                setFormData({ ...formData, pre_tax_deduction_items: items })
              }
              disabled={disabled}
              persistToSettings={false}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? (scenarioMode ? 'Applying...' : 'Saving...') : (scenarioMode ? 'Apply' : 'Save')}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-sm space-y-1 text-muted-foreground">
            <p>
              Gross: {formatCurrency(stream.annual_income / 12)}/mo · Tax: {stream.tax_rate * 100}%
            </p>
            <p>
              Pay: {stream.pay_frequency}
              {stream.pay_frequency === 'bi-weekly' &&
                ` (${stream.include_extra_paychecks ? '26' : '24'} paychecks)`}
            </p>
            {preTaxDeductions > 0 && (
              <p>Pre-tax deductions: -{formatCurrency(preTaxDeductions)}/mo</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
