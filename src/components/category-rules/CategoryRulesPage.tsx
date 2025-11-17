'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Trash2, TrendingUp, Store } from 'lucide-react';
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
              {category.rules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span>{rule.usage_count}x</span>
                      <span>•</span>
                      <span>{rule.confidence_score}% confidence</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

