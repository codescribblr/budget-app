'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, TrendingUp, Store, Edit2 } from 'lucide-react';
import type { MerchantCategoryRule, Category } from '@/lib/types';

interface CategoryWithRules extends Category {
  rules: MerchantCategoryRule[];
  totalUsage: number;
}

export default function CategoryRulesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<MerchantCategoryRule[]>([]);
  const [merchantGroups, setMerchantGroups] = useState<Map<number, string>>(new Map());
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [fadingOutRules, setFadingOutRules] = useState<Set<number>>(new Set());
  const [fadingInRules, setFadingInRules] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch categories
      const categoriesResponse = await fetch('/api/categories');
      const categoriesData = await categoriesResponse.json();

      // Fetch category rules
      const rulesResponse = await fetch('/api/category-rules');
      const rulesData = await rulesResponse.json();

      // Fetch merchant groups
      const groupsResponse = await fetch('/api/merchant-groups');
      const groupsData = await groupsResponse.json();

      // Create a map of merchant group IDs to display names
      const groupMap = new Map<number, string>();
      groupsData.forEach((group: any) => {
        groupMap.set(group.id, group.display_name);
      });

      setCategories(categoriesData);
      setRules(rulesData.rules || []);
      setMerchantGroups(groupMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRuleCategory = async (ruleId: number, newCategoryId: number) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || rule.category_id === newCategoryId) {
      setEditingRuleId(null);
      return;
    }

    try {
      // Start fade out animation
      setFadingOutRules(prev => new Set(prev).add(ruleId));

      // Wait for fade out animation
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update the rule in the backend
      const response = await fetch('/api/category-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId, categoryId: newCategoryId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      // Update local state
      setRules(prevRules =>
        prevRules.map(r =>
          r.id === ruleId ? { ...r, category_id: newCategoryId } : r
        )
      );

      // Remove from fading out, add to fading in
      setFadingOutRules(prev => {
        const next = new Set(prev);
        next.delete(ruleId);
        return next;
      });
      setFadingInRules(prev => new Set(prev).add(ruleId));

      // Remove from fading in after animation
      setTimeout(() => {
        setFadingInRules(prev => {
          const next = new Set(prev);
          next.delete(ruleId);
          return next;
        });
      }, 300);

      setEditingRuleId(null);
    } catch (error) {
      console.error('Error updating rule:', error);
      alert('Failed to update rule category');
      setFadingOutRules(prev => {
        const next = new Set(prev);
        next.delete(ruleId);
        return next;
      });
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      const response = await fetch('/api/category-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ruleId }),
      });

      if (response.ok) {
        await fetchData();
      } else {
        alert('Failed to delete rule');
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  // Group rules by category
  const categoriesWithRules: CategoryWithRules[] = categories
    .map(category => {
      const categoryRules = rules.filter(rule => rule.category_id === category.id);
      const totalUsage = categoryRules.reduce((sum, rule) => sum + rule.usage_count, 0);

      return {
        ...category,
        rules: categoryRules,
        totalUsage,
      };
    })
    .filter(category => category.rules.length > 0)
    .sort((a, b) => b.totalUsage - a.totalUsage);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (categoriesWithRules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No auto-categorization rules yet.</p>
          <p className="text-sm mt-2">
            Rules are created automatically when you categorize transactions during import.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        <p>
          These rules determine how transactions are automatically categorized during import.
          Rules are learned from your past categorization choices.
        </p>
      </div>

      {categoriesWithRules.map(category => (
        <Card key={category.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{category.name}</CardTitle>
                <CardDescription>
                  {category.rules.length} rule{category.rules.length !== 1 ? 's' : ''} • 
                  Used {category.totalUsage} time{category.totalUsage !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {category.rules.map(rule => {
                const isFadingOut = fadingOutRules.has(rule.id);
                const isFadingIn = fadingInRules.has(rule.id);
                const isEditing = editingRuleId === rule.id;

                return (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-all duration-300 ${
                      isFadingOut ? 'opacity-0 scale-95' : isFadingIn ? 'opacity-100 scale-100 bg-green-50 dark:bg-green-950/20' : 'opacity-100 scale-100'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {rule.merchant_group_id ? (
                          <>
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {merchantGroups.get(rule.merchant_group_id) || 'Unknown Group'}
                            </span>
                            <Badge variant="secondary">Group</Badge>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{rule.pattern}</span>
                            <Badge variant="outline">Pattern</Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={rule.category_id.toString()}
                            onValueChange={(value) => handleUpdateRuleCategory(rule.id, parseInt(value))}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRuleId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>{rule.usage_count}x</span>
                            <span>•</span>
                            <span>{rule.confidence_score}% confidence</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingRuleId(rule.id)}
                            title="Change category"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                            title="Delete rule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

