/** Keys in backup JSON that hold exportable data arrays (excluding metadata). */
export const BACKUP_DATA_TYPES = [
  'accounts',
  'categories',
  'credit_cards',
  'loans',
  'non_cash_assets',
  'transactions',
  'transaction_splits',
  'imported_transactions',
  'imported_transaction_links',
  'merchant_groups',
  'merchant_mappings',
  'merchant_category_rules',
  'pending_checks',
  'income_settings',
  'income_streams',
  'pre_tax_deductions',
  'settings',
  'goals',
  'csv_import_templates',
  'category_monthly_funding',
  'user_feature_flags',
  'ai_conversations',
  'duplicate_group_reviews',
  'automatic_import_setups',
  'queued_imports',
  'tags',
  'transaction_tags',
  'tag_rules',
  'recurring_transactions',
  'recurring_transaction_matches',
  'notifications',
  'category_balance_audit',
  'account_balance_audit',
  'credit_card_balance_audit',
  'loan_balance_audit',
  'asset_value_audit',
  'net_worth_snapshots',
] as const;

export type BackupDataType = (typeof BACKUP_DATA_TYPES)[number];

export interface BackupDataTypeInfo {
  key: BackupDataType;
  label: string;
  description: string;
  group: string;
}

export const BACKUP_DATA_TYPE_INFO: Record<BackupDataType, BackupDataTypeInfo> = {
  accounts: {
    key: 'accounts',
    label: 'Bank Accounts',
    description: 'Checking, savings, and cash accounts',
    group: 'Core',
  },
  categories: {
    key: 'categories',
    label: 'Budget Categories',
    description: 'Category envelopes and balances',
    group: 'Core',
  },
  credit_cards: {
    key: 'credit_cards',
    label: 'Credit Cards',
    description: 'Credit card accounts and limits',
    group: 'Core',
  },
  loans: {
    key: 'loans',
    label: 'Loans',
    description: 'Loan accounts and balances',
    group: 'Core',
  },
  non_cash_assets: {
    key: 'non_cash_assets',
    label: 'Non-Cash Assets',
    description: 'Investments, property, and other assets',
    group: 'Core',
  },
  transactions: {
    key: 'transactions',
    label: 'Transactions',
    description: 'Income, expenses, and transfers',
    group: 'Transactions',
  },
  transaction_splits: {
    key: 'transaction_splits',
    label: 'Transaction Splits',
    description: 'How transactions are split across categories',
    group: 'Transactions',
  },
  imported_transactions: {
    key: 'imported_transactions',
    label: 'Import History',
    description: 'Previously imported transactions (duplicate prevention)',
    group: 'Transactions',
  },
  imported_transaction_links: {
    key: 'imported_transaction_links',
    label: 'Import Links',
    description: 'Links between imports and transactions',
    group: 'Transactions',
  },
  pending_checks: {
    key: 'pending_checks',
    label: 'Pending Checks',
    description: 'Outstanding checks not yet cleared',
    group: 'Transactions',
  },
  merchant_groups: {
    key: 'merchant_groups',
    label: 'Merchant Groups',
    description: 'Normalized merchant names',
    group: 'Merchants',
  },
  merchant_mappings: {
    key: 'merchant_mappings',
    label: 'Merchant Mappings',
    description: 'Patterns mapped to merchant groups',
    group: 'Merchants',
  },
  merchant_category_rules: {
    key: 'merchant_category_rules',
    label: 'Merchant Category Rules',
    description: 'Auto-categorization rules from merchant patterns',
    group: 'Merchants',
  },
  tags: {
    key: 'tags',
    label: 'Tags',
    description: 'Transaction tags',
    group: 'Tags',
  },
  transaction_tags: {
    key: 'transaction_tags',
    label: 'Transaction Tags',
    description: 'Tag assignments on transactions',
    group: 'Tags',
  },
  tag_rules: {
    key: 'tag_rules',
    label: 'Tag Rules',
    description: 'Automatic tag assignment rules',
    group: 'Tags',
  },
  recurring_transactions: {
    key: 'recurring_transactions',
    label: 'Recurring Transactions',
    description: 'Detected and configured recurring patterns',
    group: 'Recurring',
  },
  recurring_transaction_matches: {
    key: 'recurring_transaction_matches',
    label: 'Recurring Matches',
    description: 'Links between recurring patterns and transactions',
    group: 'Recurring',
  },
  income_settings: {
    key: 'income_settings',
    label: 'Income Settings',
    description: 'Salary and pay configuration',
    group: 'Budget & Settings',
  },
  income_streams: {
    key: 'income_streams',
    label: 'Income Streams',
    description: 'Multiple income sources',
    group: 'Budget & Settings',
  },
  pre_tax_deductions: {
    key: 'pre_tax_deductions',
    label: 'Pre-Tax Deductions',
    description: 'Pre-tax deduction line items',
    group: 'Budget & Settings',
  },
  settings: {
    key: 'settings',
    label: 'Settings',
    description: 'Account preferences and configuration',
    group: 'Budget & Settings',
  },
  goals: {
    key: 'goals',
    label: 'Goals',
    description: 'Savings and debt payoff goals',
    group: 'Budget & Settings',
  },
  category_monthly_funding: {
    key: 'category_monthly_funding',
    label: 'Category Monthly Funding',
    description: 'Monthly funding targets per category',
    group: 'Budget & Settings',
  },
  csv_import_templates: {
    key: 'csv_import_templates',
    label: 'CSV Import Templates',
    description: 'Saved CSV column mapping templates',
    group: 'Import Automation',
  },
  automatic_import_setups: {
    key: 'automatic_import_setups',
    label: 'Automatic Import Setups',
    description: 'Teller, email, and other auto-import configs',
    group: 'Import Automation',
  },
  queued_imports: {
    key: 'queued_imports',
    label: 'Queued Imports',
    description: 'Transactions waiting for review before import',
    group: 'Import Automation',
  },
  duplicate_group_reviews: {
    key: 'duplicate_group_reviews',
    label: 'Duplicate Reviews',
    description: 'Reviewed duplicate transaction groups',
    group: 'Import Automation',
  },
  user_feature_flags: {
    key: 'user_feature_flags',
    label: 'Feature Flags',
    description: 'Enabled beta and experimental features',
    group: 'Other',
  },
  ai_conversations: {
    key: 'ai_conversations',
    label: 'AI Conversations',
    description: 'Budget assistant chat history',
    group: 'Other',
  },
  notifications: {
    key: 'notifications',
    label: 'Notifications',
    description: 'Account-scoped notification history',
    group: 'Other',
  },
  net_worth_snapshots: {
    key: 'net_worth_snapshots',
    label: 'Net Worth Snapshots',
    description: 'Historical net worth records',
    group: 'Other',
  },
  category_balance_audit: {
    key: 'category_balance_audit',
    label: 'Category Balance Audit',
    description: 'Category balance change history',
    group: 'Audit History',
  },
  account_balance_audit: {
    key: 'account_balance_audit',
    label: 'Account Balance Audit',
    description: 'Bank account balance change history',
    group: 'Audit History',
  },
  credit_card_balance_audit: {
    key: 'credit_card_balance_audit',
    label: 'Credit Card Balance Audit',
    description: 'Credit card balance change history',
    group: 'Audit History',
  },
  loan_balance_audit: {
    key: 'loan_balance_audit',
    label: 'Loan Balance Audit',
    description: 'Loan balance change history',
    group: 'Audit History',
  },
  asset_value_audit: {
    key: 'asset_value_audit',
    label: 'Asset Value Audit',
    description: 'Non-cash asset value change history',
    group: 'Audit History',
  },
};

/**
 * Types that must also be included when exporting/importing a given type.
 * Transitive closure is applied by resolveBackupTypeSelection().
 */
export const BACKUP_TYPE_DEPENDENCIES: Record<BackupDataType, BackupDataType[]> = {
  accounts: [],
  categories: [],
  credit_cards: [],
  loans: ['non_cash_assets'],
  non_cash_assets: [],
  transactions: ['accounts', 'credit_cards', 'merchant_groups'],
  transaction_splits: ['transactions', 'categories'],
  imported_transactions: [],
  imported_transaction_links: ['imported_transactions', 'transactions'],
  merchant_groups: [],
  merchant_mappings: ['merchant_groups'],
  merchant_category_rules: ['merchant_groups', 'categories'],
  pending_checks: ['accounts'],
  income_settings: [],
  income_streams: ['non_cash_assets'],
  pre_tax_deductions: [],
  settings: [],
  goals: ['accounts', 'categories', 'credit_cards', 'loans', 'non_cash_assets'],
  csv_import_templates: ['accounts', 'credit_cards'],
  category_monthly_funding: ['categories'],
  user_feature_flags: [],
  ai_conversations: [],
  duplicate_group_reviews: ['transactions', 'accounts', 'credit_cards', 'merchant_groups'],
  automatic_import_setups: ['accounts', 'credit_cards', 'csv_import_templates'],
  queued_imports: [
    'automatic_import_setups',
    'accounts',
    'credit_cards',
    'categories',
    'csv_import_templates',
  ],
  tags: [],
  transaction_tags: ['tags', 'transactions', 'accounts', 'credit_cards', 'merchant_groups'],
  tag_rules: ['tags'],
  recurring_transactions: ['accounts', 'credit_cards', 'categories', 'merchant_groups'],
  recurring_transaction_matches: [
    'recurring_transactions',
    'transactions',
    'accounts',
    'credit_cards',
    'categories',
    'merchant_groups',
  ],
  notifications: [],
  category_balance_audit: ['categories', 'transactions', 'accounts', 'credit_cards', 'merchant_groups'],
  account_balance_audit: ['accounts', 'transactions', 'merchant_groups'],
  credit_card_balance_audit: ['credit_cards', 'transactions', 'merchant_groups'],
  loan_balance_audit: ['loans', 'transactions', 'non_cash_assets', 'merchant_groups'],
  asset_value_audit: ['non_cash_assets'],
  net_worth_snapshots: [],
};

export type BackupPayload = {
  version: string;
  created_at: string;
  included_types?: BackupDataType[];
} & Partial<Record<BackupDataType, unknown[]>>;

export function isBackupDataType(value: string): value is BackupDataType {
  return (BACKUP_DATA_TYPES as readonly string[]).includes(value);
}

export function getBackupRecordCount(
  backupData: BackupPayload,
  type: BackupDataType
): number {
  const records = backupData[type];
  return Array.isArray(records) ? records.length : 0;
}

/** Returns data types that have at least one record in the backup file. */
export function getTypesPresentInBackup(backupData: BackupPayload): BackupDataType[] {
  return BACKUP_DATA_TYPES.filter((type) => getBackupRecordCount(backupData, type) > 0);
}

/** Expand selected types to include all transitive dependencies, optionally limited to available types. */
export function resolveBackupTypeSelection(
  selected: BackupDataType[],
  options?: { limitTo?: BackupDataType[] }
): BackupDataType[] {
  const limitSet = options?.limitTo ? new Set(options.limitTo) : null;
  const resolved = new Set<BackupDataType>();

  const addWithDependencies = (type: BackupDataType) => {
    if (limitSet && !limitSet.has(type)) {
      return;
    }
    if (resolved.has(type)) {
      return;
    }
    resolved.add(type);
    for (const dependency of BACKUP_TYPE_DEPENDENCIES[type]) {
      addWithDependencies(dependency);
    }
  };

  for (const type of selected) {
    addWithDependencies(type);
  }

  return BACKUP_DATA_TYPES.filter((type) => resolved.has(type));
}

/** Returns types that were auto-added because of dependencies (not in original selection). */
export function getAutoIncludedTypes(
  selected: BackupDataType[],
  resolved: BackupDataType[]
): BackupDataType[] {
  const selectedSet = new Set(selected);
  return resolved.filter((type) => !selectedSet.has(type));
}

/** Toggle a type on/off; when enabling, also enables dependencies. When disabling, disables dependents. */
export function toggleBackupTypeSelection(
  current: BackupDataType[],
  type: BackupDataType,
  checked: boolean,
  options?: { limitTo?: BackupDataType[] }
): BackupDataType[] {
  const limitTo = options?.limitTo ?? [...BACKUP_DATA_TYPES];
  const limitSet = new Set(limitTo);
  const currentSet = new Set(current.filter((t) => limitSet.has(t)));

  if (checked) {
    return resolveBackupTypeSelection([...currentSet, type], { limitTo });
  }

  const dependents = getDependents(type).filter((t) => limitSet.has(t));
  for (const dependent of dependents) {
    currentSet.delete(dependent);
  }
  currentSet.delete(type);

  return BACKUP_DATA_TYPES.filter((t) => currentSet.has(t));
}

/** Toggle all types in a group on/off, preserving types required by selections outside the group. */
export function toggleBackupGroupSelection(
  current: BackupDataType[],
  groupTypes: BackupDataType[],
  checked: boolean,
  options?: { limitTo?: BackupDataType[] }
): BackupDataType[] {
  const limitTo = options?.limitTo ?? [...BACKUP_DATA_TYPES];
  const limitSet = new Set(limitTo);
  const groupSet = new Set(groupTypes.filter((t) => limitSet.has(t)));
  const typesInGroup = BACKUP_DATA_TYPES.filter((t) => groupSet.has(t));

  if (typesInGroup.length === 0) {
    return BACKUP_DATA_TYPES.filter((t) => limitSet.has(t) && current.includes(t));
  }

  if (checked) {
    const merged = new Set([
      ...current.filter((t) => limitSet.has(t)),
      ...typesInGroup,
    ]);
    return resolveBackupTypeSelection([...merged], { limitTo });
  }

  const outsideGroup = current.filter((t) => limitSet.has(t) && !groupSet.has(t));
  const requiredByOutside = new Set(resolveBackupTypeSelection(outsideGroup, { limitTo }));

  let result = current.filter((t) => limitSet.has(t));
  for (const type of typesInGroup) {
    if (!requiredByOutside.has(type)) {
      result = toggleBackupTypeSelection(result, type, false, { limitTo });
    }
  }

  return result;
}

export function getBackupGroupCheckState(
  selectedTypes: BackupDataType[],
  groupTypes: BackupDataType[],
  options?: { limitTo?: BackupDataType[] }
): 'checked' | 'unchecked' | 'indeterminate' {
  const limitSet = new Set(options?.limitTo ?? groupTypes);
  const typesInGroup = groupTypes.filter((t) => limitSet.has(t));

  if (typesInGroup.length === 0) {
    return 'unchecked';
  }

  const selectedCount = typesInGroup.filter((t) => selectedTypes.includes(t)).length;
  if (selectedCount === 0) {
    return 'unchecked';
  }
  if (selectedCount === typesInGroup.length) {
    return 'checked';
  }
  return 'indeterminate';
}

function getDependents(type: BackupDataType): BackupDataType[] {
  const dependents: BackupDataType[] = [];
  for (const candidate of BACKUP_DATA_TYPES) {
    if (doesTypeDependOn(candidate, type)) {
      dependents.push(candidate);
    }
  }
  return dependents;
}

function doesTypeDependOn(type: BackupDataType, dependency: BackupDataType): boolean {
  const visited = new Set<BackupDataType>();
  const stack = [...BACKUP_TYPE_DEPENDENCIES[type]];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === dependency) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    stack.push(...BACKUP_TYPE_DEPENDENCIES[current]);
  }

  return false;
}

export function isFullBackupSelection(
  selected: BackupDataType[],
  available: BackupDataType[] = [...BACKUP_DATA_TYPES]
): boolean {
  const availableSet = new Set(available);
  return available.every((type) => selected.includes(type));
}

/** Strip backup payload down to metadata + selected data arrays. */
export function filterBackupDataByTypes<T extends BackupPayload>(
  backupData: T,
  selectedTypes: BackupDataType[]
): T {
  const selectedSet = new Set(selectedTypes);
  const filtered = { ...backupData } as T;

  for (const type of BACKUP_DATA_TYPES) {
    if (!selectedSet.has(type)) {
      (filtered as Record<string, unknown>)[type] = [];
    }
  }

  filtered.included_types = selectedTypes;

  return filtered;
}

export function listBackupDataTypesForApi(): BackupDataTypeInfo[] {
  return BACKUP_DATA_TYPES.map((type) => BACKUP_DATA_TYPE_INFO[type]);
}

/** Ensure selected import types have required dependency data in the backup file. */
export function validateImportSelection(
  backupData: BackupPayload,
  selected: BackupDataType[]
): { valid: boolean; missingDependencies: BackupDataType[]; resolvedTypes: BackupDataType[] } {
  const present = getTypesPresentInBackup(backupData);
  const presentSet = new Set(present);
  const missingDependencies: BackupDataType[] = [];

  for (const type of selected) {
    for (const dependency of BACKUP_TYPE_DEPENDENCIES[type]) {
      if (!presentSet.has(dependency)) {
        missingDependencies.push(dependency);
      }
    }
  }

  const uniqueMissing = BACKUP_DATA_TYPES.filter(
    (type) => missingDependencies.includes(type)
  );

  const resolvedTypes = resolveBackupTypeSelection(selected, { limitTo: present });

  return {
    valid: uniqueMissing.length === 0,
    missingDependencies: uniqueMissing,
    resolvedTypes,
  };
}
