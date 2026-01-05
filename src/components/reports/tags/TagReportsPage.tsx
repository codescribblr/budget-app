'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import TagSpendingReport from './TagSpendingReport';
import TagTransactionList from './TagTransactionList';
import type { TransactionWithSplits, Tag } from '@/lib/types';
import { format } from 'date-fns';

export default function TagReportsPage() {
  const searchParams = useSearchParams();
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  useEffect(() => {
    const tagParam = searchParams.get('tag');
    if (tagParam) {
      const tagId = parseInt(tagParam);
      if (!isNaN(tagId)) {
        setSelectedTagId(tagId);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [transactionsRes, tagsRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/tags'),
        ]);

        if (transactionsRes.ok && tagsRes.ok) {
          const transactionsData = await transactionsRes.json();
          const tagsData = await tagsRes.json();
          setTransactions(transactionsData);
          setTags(tagsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (startDate) {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      filtered = filtered.filter(t => t.date >= startDateStr);
    }

    if (endDate) {
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      filtered = filtered.filter(t => t.date <= endDateStr);
    }

    if (selectedTagId) {
      filtered = filtered.filter(t =>
        t.tags?.some(tag => tag.id === selectedTagId)
      );
    }

    return filtered;
  }, [transactions, startDate, endDate, selectedTagId]);

  const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
  const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Tag Reports</h1>
        <p className="text-muted-foreground mt-1">Analyze spending and trends by tags</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <DatePicker
                date={endDate}
                onDateChange={setEndDate}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tag</label>
              <Select
                value={selectedTagId?.toString() || 'all'}
                onValueChange={(value) => setSelectedTagId(value === 'all' ? null : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id.toString()}>
                      {tag.color && (
                        <div
                          className="w-3 h-3 rounded-full inline-block mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setSelectedTagId(null);
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tag Spending Report */}
      <TagSpendingReport
        transactions={filteredTransactions}
        tags={tags}
        startDate={startDateStr}
        endDate={endDateStr}
        loading={loading}
      />

      {/* Tag Transaction List */}
      {selectedTagId && (
        <TagTransactionList
          transactions={filteredTransactions}
          tag={tags.find(t => t.id === selectedTagId)!}
          startDate={startDateStr}
          endDate={endDateStr}
        />
      )}
    </div>
  );
}

