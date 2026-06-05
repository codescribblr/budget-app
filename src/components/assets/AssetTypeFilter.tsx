'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';
import type { NonCashAsset } from '@/lib/types';
import { NON_CASH_ASSET_TYPE_OPTIONS } from '@/lib/non-cash-asset-types';

interface AssetTypeFilterProps {
  selectedTypes: NonCashAsset['asset_type'][];
  onChange: (types: NonCashAsset['asset_type'][]) => void;
}

export default function AssetTypeFilter({ selectedTypes, onChange }: AssetTypeFilterProps) {
  const toggleType = (type: NonCashAsset['asset_type']) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter((value) => value !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Filter className="mr-2 h-4 w-4" />
          Asset Type
          {selectedTypes.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedTypes.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Filter by asset type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={selectedTypes.length === 0}
          onCheckedChange={() => onChange([])}
        >
          All types
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {NON_CASH_ASSET_TYPE_OPTIONS.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedTypes.includes(option.value)}
            onCheckedChange={() => toggleType(option.value)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
