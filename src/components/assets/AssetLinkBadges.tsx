'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NonCashAsset } from '@/lib/types';
import type { AssetLinks } from '@/lib/asset-links';
import { cn } from '@/lib/utils';
import { DollarSign, Home, Landmark } from 'lucide-react';

interface AssetLinkBadgesProps {
  asset: Pick<NonCashAsset, 'id' | 'rentcast_enabled'>;
  links?: AssetLinks;
  className?: string;
}

function LinkBadge({
  label,
  tooltip,
  href,
  className,
  icon,
}: {
  label: string;
  tooltip: string;
  href?: string;
  className?: string;
  icon: ReactNode;
}) {
  const badge = (
    <Badge variant="outline" className={cn('text-xs gap-1 px-1.5 py-0', className)}>
      {icon}
      {label}
    </Badge>
  );

  const content = href ? (
    <Link href={href} onClick={(event) => event.stopPropagation()} className="inline-flex">
      {badge}
    </Link>
  ) : (
    badge
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export default function AssetLinkBadges({ asset, links, className }: AssetLinkBadgesProps) {
  const showIncome = Boolean(links?.incomeStream);
  const showLoan = Boolean(links?.loan);
  const showRentCast = Boolean(asset.rentcast_enabled);

  if (!showIncome && !showLoan && !showRentCast) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {showIncome && links?.incomeStream && (
        <LinkBadge
          label="Income"
          tooltip={`Linked to income stream: ${links.incomeStream.name}`}
          href="/income"
          className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
          icon={<DollarSign className="h-3 w-3" />}
        />
      )}
      {showLoan && links?.loan && (
        <LinkBadge
          label="Loan"
          tooltip={`Linked to loan: ${links.loan.name}`}
          href={`/loans/${links.loan.id}`}
          className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          icon={<Landmark className="h-3 w-3" />}
        />
      )}
      {showRentCast && (
        <LinkBadge
          label="RentCast"
          tooltip="RentCast value tracking is enabled for this property"
          href={`/non-cash-assets/${asset.id}`}
          className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          icon={<Home className="h-3 w-3" />}
        />
      )}
    </div>
  );
}
