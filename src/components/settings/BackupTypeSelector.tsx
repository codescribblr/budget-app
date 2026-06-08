'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { BACKUP_DATA_TYPES, BACKUP_DATA_TYPE_INFO } from '@/lib/backup-data-types';
import type { BackupDataType } from '@/lib/backup-data-types';
import {
  getAutoIncludedTypes,
  getBackupGroupCheckState,
  resolveBackupTypeSelection,
  toggleBackupGroupSelection,
  toggleBackupTypeSelection,
} from '@/lib/backup-data-types';

/** Shared dialog sizing for export/import/restore backup selection modals. */
export const BACKUP_SELECTION_DIALOG_CLASS =
  'sm:max-w-3xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-y-auto';

interface BackupTypeSelectorProps {
  availableTypes: BackupDataType[];
  selectedTypes: BackupDataType[];
  onChange: (types: BackupDataType[]) => void;
  recordCounts?: Partial<Record<BackupDataType, number>>;
  disabledTypes?: BackupDataType[];
  className?: string;
}

export default function BackupTypeSelector({
  availableTypes,
  selectedTypes,
  onChange,
  recordCounts,
  disabledTypes = [],
  className,
}: BackupTypeSelectorProps) {
  const availableSet = useMemo(() => new Set(availableTypes), [availableTypes]);
  const disabledSet = useMemo(() => new Set(disabledTypes), [disabledTypes]);
  const autoIncluded = useMemo(
    () => getAutoIncludedTypes(selectedTypes, resolveBackupTypeSelection(selectedTypes, { limitTo: availableTypes })),
    [selectedTypes, availableTypes]
  );
  const autoIncludedSet = useMemo(() => new Set(autoIncluded), [autoIncluded]);

  const groupedTypes = useMemo(() => {
    const groups = new Map<string, BackupDataType[]>();
    for (const type of BACKUP_DATA_TYPES) {
      if (!availableSet.has(type)) continue;
      const group = BACKUP_DATA_TYPE_INFO[type].group;
      const existing = groups.get(group) ?? [];
      existing.push(type);
      groups.set(group, existing);
    }
    return [...groups.entries()];
  }, [availableSet]);

  const handleToggle = (type: BackupDataType, checked: boolean) => {
    onChange(toggleBackupTypeSelection(selectedTypes, type, checked, { limitTo: availableTypes }));
  };

  const handleGroupToggle = (groupTypes: BackupDataType[], checked: boolean) => {
    onChange(toggleBackupGroupSelection(selectedTypes, groupTypes, checked, { limitTo: availableTypes }));
  };

  const allAvailableTypes = useMemo(
    () => BACKUP_DATA_TYPES.filter((type) => availableSet.has(type)),
    [availableSet]
  );

  const allSelected =
    allAvailableTypes.length > 0 &&
    allAvailableTypes.every((type) => selectedTypes.includes(type));
  const noneSelected = selectedTypes.length === 0;

  const handleSelectAll = () => {
    onChange([...allAvailableTypes]);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  return (
    <div className={cn('flex min-h-0 flex-col gap-3', className)}>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          onClick={handleSelectAll}
          disabled={allSelected}
        >
          Select all
        </Button>
        <span className="text-muted-foreground" aria-hidden="true">
          ·
        </span>
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          onClick={handleDeselectAll}
          disabled={noneSelected}
        >
          Deselect all
        </Button>
      </div>

      {autoIncluded.length > 0 && (
        <p className="shrink-0 text-sm text-muted-foreground">
          Required related data was auto-selected:{' '}
          {autoIncluded.map((type) => BACKUP_DATA_TYPE_INFO[type].label).join(', ')}
        </p>
      )}

      <div className="min-h-[240px] max-h-[50vh] overflow-y-auto pr-1 md:min-h-[320px] md:max-h-[58vh] lg:max-h-[62vh]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groupedTypes.map(([group, types]) => {
            const groupState = getBackupGroupCheckState(selectedTypes, types, {
              limitTo: availableTypes,
            });
            const groupCheckboxId = `backup-group-${group.replace(/\s+/g, '-').toLowerCase()}`;

            return (
              <div
                key={group}
                className="flex flex-col rounded-lg border bg-muted/30 p-3 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2 border-b pb-2">
                  <Checkbox
                    id={groupCheckboxId}
                    checked={
                      groupState === 'indeterminate' ? 'indeterminate' : groupState === 'checked'
                    }
                    onCheckedChange={(checked) => handleGroupToggle(types, checked === true)}
                  />
                  <Label
                    htmlFor={groupCheckboxId}
                    className="text-sm font-semibold leading-none text-foreground"
                  >
                    {group}
                  </Label>
                </div>

                <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
                  {types.map((type) => {
                    const info = BACKUP_DATA_TYPE_INFO[type];
                    const count = recordCounts?.[type];
                    const isDisabled = disabledSet.has(type);
                    const isAutoIncluded = autoIncludedSet.has(type);
                    const isRequired = isAutoIncluded && selectedTypes.includes(type);
                    const checkboxId = `backup-type-${type}`;

                    return (
                      <div key={type} className="flex items-start gap-2 py-0.5">
                        <Checkbox
                          id={checkboxId}
                          checked={selectedTypes.includes(type)}
                          disabled={isDisabled || isRequired}
                          onCheckedChange={(checked) => handleToggle(type, checked === true)}
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor={checkboxId}
                          title={info.description}
                          className="cursor-pointer text-sm font-normal leading-snug"
                        >
                          <span className="font-medium">{info.label}</span>
                          {typeof count === 'number' && (
                            <span className="ml-1 text-xs text-muted-foreground">({count})</span>
                          )}
                          {isRequired && (
                            <span className="ml-1 text-xs text-muted-foreground">· required</span>
                          )}
                          <span className="mt-0.5 block text-xs text-muted-foreground lg:hidden">
                            {info.description}
                          </span>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { BACKUP_DATA_TYPES as ALL_BACKUP_DATA_TYPES };
