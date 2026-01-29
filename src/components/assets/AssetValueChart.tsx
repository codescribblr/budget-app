'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ValueDataPoint {
  date: string;
  value: number;
}

interface AssetValueChartProps {
  assetId: number;
}

export default function AssetValueChart({ assetId }: AssetValueChartProps) {
  const [data, setData] = useState<ValueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchValueHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/non-cash-assets/${assetId}/value-history`);
        if (!response.ok) {
          throw new Error('Failed to fetch value history');
        }
        const history = await response.json();
        
        const valueMap = new Map<string, number>();
        
        history.forEach((record: any) => {
          const date = record.created_at.split('T')[0];
          valueMap.set(date, record.new_value);
        });
        
        const chartData: ValueDataPoint[] = Array.from(valueMap.entries())
          .map(([date, value]) => ({
            date,
            value: Number(value),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        setData(chartData);
      } catch (error) {
        console.error('Error fetching value history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (assetId) {
      fetchValueHistory();
    }
  }, [assetId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            No value history available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Value Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => format(parseISO(value), 'MMM d')}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ValueDataPoint;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <div className="font-semibold mb-2 text-foreground">
                        {format(parseISO(data.date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-foreground">
                        Value: {formatCurrency(data.value)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0088FE"
              strokeWidth={2}
              name="Value"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
