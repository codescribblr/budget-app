import registryData from '../merchant-registry.json';
import { normalizeText } from './text-utils';

export interface RegistryEntry {
  pattern: string;
  label: string;
}

export interface RegistryMatch {
  blocked: boolean;
  allowlisted: boolean;
  membershipException: boolean;
  variableBillHint: boolean;
  label: string | null;
}

function matchPattern(text: string, pattern: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  } catch {
    return text.includes(pattern.toUpperCase());
  }
}

function findMatch(text: string, entries: RegistryEntry[]): RegistryEntry | null {
  for (const entry of entries) {
    if (matchPattern(text, entry.pattern)) {
      return entry;
    }
  }
  return null;
}

export function matchMerchantRegistry(text: string): RegistryMatch {
  const normalized = normalizeText(text);
  const allowlist = findMatch(normalized, registryData.subscription_allowlist);
  const blocklist = findMatch(normalized, registryData.discretionary_blocklist);
  const membership = findMatch(normalized, registryData.membership_exceptions);
  const variableHint = findMatch(normalized, registryData.variable_bill_hints);

  return {
    blocked: Boolean(blocklist) && !allowlist && !membership,
    allowlisted: Boolean(allowlist),
    membershipException: Boolean(membership),
    variableBillHint: Boolean(variableHint),
    label:
      allowlist?.label ||
      membership?.label ||
      variableHint?.label ||
      blocklist?.label ||
      null,
  };
}

export function isBlocklistEscape(
  amountCV: number,
  frequency: string,
  allowlisted: boolean,
  membershipException: boolean
): boolean {
  if (allowlisted || membershipException) return true;
  return amountCV < 0.05 && ['monthly', 'quarterly', 'yearly'].includes(frequency);
}
