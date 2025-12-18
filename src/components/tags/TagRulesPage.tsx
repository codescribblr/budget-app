'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, Plus, Tag as TagIcon, Folder, Store, FileText, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import type { TagRule, Tag, Category } from '@/lib/types';
import { toast } from 'sonner';

export default function TagRulesPage() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<TagRule[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<TagRule | null>(null);

  // Form state
  const [formTagId, setFormTagId] = useState<number | null>(null);
  const [formRuleType, setFormRuleType] = useState<'category' | 'merchant' | 'description' | 'amount'>('description');
  const [formRuleValue, setFormRuleValue] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const [rulesRes, tagsRes, categoriesRes] = await Promise.all([
        fetch('/api/tag-rules'),
        fetch('/api/tags'),
        fetch('/api/categories?excludeGoals=true'),
      ]);

      if (rulesRes.ok) setRules(await rulesRes.json());
      if (tagsRes.ok) setTags(await tagsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load tag rules');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Only fetch once on mount
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchData();
    }
  }, []);

  const handleCreateRule = async () => {
    if (!formTagId || !formRuleValue.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/tag-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_id: formTagId,
          rule_type: formRuleType,
          rule_value: formRuleValue.trim(),
          priority: formPriority,
          is_active: formIsActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create rule');
      }

      toast.success('Tag rule created');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating rule:', error);
      toast.error(error.message || 'Failed to create rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: TagRule) => {
    try {
      const response = await fetch(`/api/tag-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });

      if (!response.ok) throw new Error('Failed to update rule');
      toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const handleDeleteRule = (rule: TagRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;

    try {
      const response = await fetch(`/api/tag-rules/${ruleToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete rule');
      toast.success('Rule deleted');
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const resetForm = () => {
    setFormTagId(null);
    setFormRuleType('description');
    setFormRuleValue('');
    setFormPriority(0);
    setFormIsActive(true);
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'category': return <Folder className="h-4 w-4" />;
      case 'merchant': return <Store className="h-4 w-4" />;
      case 'description': return <FileText className="h-4 w-4" />;
      case 'amount': return <DollarSign className="h-4 w-4" />;
      default: return null;
    }
  };

  const getRuleDisplayValue = (rule: TagRule) => {
    if (rule.rule_type === 'category') {
      const category = categories.find(c => c.id === parseInt(rule.rule_value));
      return category?.name || rule.rule_value;
    }
    return rule.rule_value;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Tag Rules</h1>
          <p className="text-muted-foreground mt-1">
            Automatically assign tags to transactions based on rules
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No tag rules yet.</p>
            <p className="text-sm mt-2">
              Create rules to automatically assign tags to transactions based on category, merchant, description, or amount.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => {
            const tag = tags.find(t => t.id === rule.tag_id);
            return (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {getRuleTypeIcon(rule.rule_type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getRuleDisplayValue(rule)}</span>
                            <Badge variant="secondary">{rule.rule_type}</Badge>
                            {tag && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                {tag.color && (
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                )}
                                <TagIcon className="h-3 w-3" />
                                {tag.name}
                              </Badge>
                            )}
                          </div>
                          {rule.priority !== 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Priority: {rule.priority}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(rule)}
                        title={rule.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {rule.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule)}
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tag">Tag *</Label>
              <Select value={formTagId?.toString() || ''} onValueChange={(v) => setFormTagId(parseInt(v))}>
                <SelectTrigger id="tag">
                  <SelectValue placeholder="Select tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.id.toString()}>
                      <div className="flex items-center gap-2">
                        {tag.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        )}
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ruleType">Rule Type *</Label>
              <Select value={formRuleType} onValueChange={(v: any) => setFormRuleType(v)}>
                <SelectTrigger id="ruleType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="description">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description contains
                    </div>
                  </SelectItem>
                  <SelectItem value="category">
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Category matches
                    </div>
                  </SelectItem>
                  <SelectItem value="merchant">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Merchant contains
                    </div>
                  </SelectItem>
                  <SelectItem value="amount">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Amount equals
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formRuleType === 'category' ? (
              <div>
                <Label htmlFor="ruleValue">Category *</Label>
                <Select value={formRuleValue} onValueChange={setFormRuleValue}>
                  <SelectTrigger id="ruleValue">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label htmlFor="ruleValue">Rule Value *</Label>
                <Input
                  id="ruleValue"
                  value={formRuleValue}
                  onChange={(e) => setFormRuleValue(e.target.value)}
                  placeholder={
                    formRuleType === 'description' ? 'e.g., Home Depot' :
                    formRuleType === 'merchant' ? 'e.g., Walmart' :
                    formRuleType === 'amount' ? 'e.g., 50.00' : ''
                  }
                />
              </div>
            )}

            <div>
              <Label htmlFor="priority">Priority (higher = applied first)</Label>
              <Input
                id="priority"
                type="number"
                value={formPriority}
                onChange={(e) => setFormPriority(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRule} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setRuleToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRule} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
