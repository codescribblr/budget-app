import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { DashboardSummary } from '@/lib/types';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Total Monies
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <div className="text-sm md:text-lg lg:text-xl xl:text-2xl font-bold">{formatCurrency(summary.total_monies)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Total Envelopes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <div className={`text-sm md:text-lg lg:text-xl xl:text-2xl font-bold ${summary.has_negative_envelopes ? 'text-red-600' : ''}`}>
            {formatCurrency(summary.total_envelopes)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Credit Card Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <div className="text-sm md:text-lg lg:text-xl xl:text-2xl font-bold">{formatCurrency(summary.total_credit_card_balances)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Pending Checks
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <div className="text-sm md:text-lg lg:text-xl xl:text-2xl font-bold">{formatCurrency(summary.total_pending_checks)}</div>
        </CardContent>
      </Card>

      <Card className={summary.current_savings < 0 ? 'border-red-500' : 'border-green-500'}>
        <CardHeader className="pb-0 md:pb-2">
          <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
            Available to Save
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-1 md:pb-4">
          <div className={`text-sm md:text-lg lg:text-xl xl:text-2xl font-bold ${summary.current_savings < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(summary.current_savings)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

