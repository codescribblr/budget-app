import { getAuthenticatedUser } from './supabase-queries';
import { getExternalApiAccountOverride } from './external-api-overrides';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { createServiceRoleClient } from './supabase/server';

export interface AccountMembership {
  accountId: number;
  accountPublicId: string;
  role: 'owner' | 'editor' | 'viewer';
  accountName: string;
  isOwner: boolean;
}

const ACTIVE_ACCOUNT_COOKIE = 'active_account_id';

/**
 * Get the active account ID for the current user
 * Checks cookie first, then falls back to user's primary account
 * Uses React's cache() for request-scoped memoization to avoid repeated database calls
 * within the same request
 */
export const getActiveAccountId = cache(async (): Promise<number | null> => {
  const accountOverride = getExternalApiAccountOverride();
  if (accountOverride !== null) {
    return accountOverride;
  }

  const { supabase, user } = await getAuthenticatedUser();
  
  // Try to read from cookie first
  try {
    const cookieStore = await cookies();
    const activeAccountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE);
    if (activeAccountId?.value) {
      const accountId = parseInt(activeAccountId.value);
      if (!isNaN(accountId)) {
        // Optimized validation: Use a single query with OR condition to check both owner and member
        // This reduces from 2 queries to 1 query in the worst case
        const { data: account } = await supabase
          .from('budget_accounts')
          .select('id, owner_id')
          .eq('id', accountId)
          .is('deleted_at', null)
          .single();
        
        if (account) {
          // Check if user is owner (most common case - check first)
          if (account.owner_id === user.id) {
            return accountId;
          }
          
          // If not owner, check if user is a member in a single query
          // Use head() since we only need to know if it exists
          const { count } = await supabase
            .from('account_users')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', accountId)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .limit(1);
          
          if (count && count > 0) {
            return accountId;
          }
        }
      }
    }
  } catch (error) {
    // Cookie not available, continue to fallback
  }
  
  // Fallback: Get user's primary account
  // Priority: owned accounts first, then shared accounts (collaborator accounts)
  // This ensures collaborators without their own account get their shared account activated
  
  // First check if user owns any accounts (prefer oldest / primary account)
  const { data: ownedAccounts } = await supabase
    .from('budget_accounts')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('id', { ascending: true })
    .limit(1);

  if (ownedAccounts && ownedAccounts.length > 0) {
    return ownedAccounts[0].id;
  }

  // If no owned accounts, check shared accounts (user is a collaborator)
  const { data: accountUsers } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('account_id', { ascending: true })
    .limit(1);

  if (accountUsers && accountUsers.length > 0) {
    return accountUsers[0].account_id;
  }

  // No accounts accessible — do not auto-create here. Account provisioning is handled
  // explicitly during signup (auth callback) or via POST /api/budget-accounts.
  return null;
});

/**
 * Provision a default budget account for new users who have none.
 * Uses service role for reliable checks and must only be called from explicit
 * provisioning flows (signup/auth callback), NOT from read-only GET handlers.
 */
export async function provisionDefaultBudgetAccountIfNeeded(): Promise<number | null> {
  const { user } = await getAuthenticatedUser();
  const adminSupabase = createServiceRoleClient();

  const { data: pendingInvitations } = await adminSupabase
    .from('account_invitations')
    .select('id')
    .eq('email', user.email?.toLowerCase() || '')
    .is('accepted_at', null)
    .limit(1);

  if (pendingInvitations && pendingInvitations.length > 0) {
    return null;
  }

  const findExistingOwnedAccount = async () => {
    const { data } = await adminSupabase
      .from('budget_accounts')
      .select('id')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .order('id', { ascending: true })
      .limit(1);
    return data?.[0]?.id ?? null;
  };

  const existingOwnedId = await findExistingOwnedAccount();
  if (existingOwnedId) {
    await setActiveAccountIdCookie(existingOwnedId);
    return existingOwnedId;
  }

  const { data: sharedAccounts } = await adminSupabase
    .from('account_users')
    .select('account_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('account_id', { ascending: true })
    .limit(1);

  if (sharedAccounts && sharedAccounts.length > 0) {
    await setActiveAccountIdCookie(sharedAccounts[0].account_id);
    return sharedAccounts[0].account_id;
  }

  const accountName = user.email?.split('@')[0] || 'My Budget';
  const { data: newAccount, error: accountError } = await adminSupabase
    .from('budget_accounts')
    .insert({
      owner_id: user.id,
      name: accountName,
    })
    .select('id')
    .single();

  if (accountError) {
    // Another concurrent request may have created the account — re-check
    const racedId = await findExistingOwnedAccount();
    if (racedId) {
      await setActiveAccountIdCookie(racedId);
      return racedId;
    }
    console.error('Error provisioning default budget account:', accountError);
    return null;
  }

  if (!newAccount) {
    return null;
  }

  await adminSupabase
    .from('account_users')
    .insert({
      account_id: newAccount.id,
      user_id: user.id,
      role: 'owner',
      status: 'active',
      accepted_at: new Date().toISOString(),
    });

  await setActiveAccountIdCookie(newAccount.id);
  return newAccount.id;
}

/**
 * Resolve the best active account id for the current user without side effects.
 * Prefers the oldest owned account when no valid cookie is set.
 */
export async function resolveActiveAccountId(
  accounts: AccountMembership[]
): Promise<number | null> {
  const fromCookie = await getActiveAccountId();
  if (fromCookie) {
    return fromCookie;
  }

  if (accounts.length === 0) {
    return null;
  }

  const ownedAccounts = accounts.filter((a) => a.isOwner);
  if (ownedAccounts.length > 0) {
    return ownedAccounts.reduce((oldest, account) =>
      account.accountId < oldest.accountId ? account : oldest
    ).accountId;
  }

  return accounts[0].accountId;
}

interface CleanupDuplicateAccountsResult {
  cleaned: boolean;
  keptAccountId: number | null;
  deletedAccountIds: number[];
}

/**
 * Remove duplicate empty owned budget accounts, keeping the one with the most data.
 * Safe to call repeatedly — only deletes owned accounts with zero transactions.
 */
export async function cleanupDuplicateEmptyAccounts(): Promise<CleanupDuplicateAccountsResult> {
  const { user } = await getAuthenticatedUser();
  const admin = createServiceRoleClient();

  const { data: ownedAccounts, error: ownedError } = await admin
    .from('budget_accounts')
    .select('id, name, created_at')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('id', { ascending: true });

  if (ownedError) throw ownedError;

  const accounts = ownedAccounts || [];
  if (accounts.length <= 1) {
    return { cleaned: false, keptAccountId: accounts[0]?.id ?? null, deletedAccountIds: [] };
  }

  const transactionCounts = await Promise.all(
    accounts.map(async (account) => {
      const { count } = await admin
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('budget_account_id', account.id);
      return { accountId: account.id, count: count || 0 };
    })
  );

  const countById = new Map(transactionCounts.map((row) => [row.accountId, row.count]));

  const accountToKeep = accounts.reduce((best, account) => {
    const bestCount = countById.get(best.id) || 0;
    const accountCount = countById.get(account.id) || 0;
    if (accountCount > bestCount) return account;
    if (accountCount < bestCount) return best;
    return account.id < best.id ? account : best;
  });

  const accountsToDelete = accounts.filter((account) => {
    if (account.id === accountToKeep.id) return false;
    return (countById.get(account.id) || 0) === 0;
  });

  if (accountsToDelete.length === 0) {
    await setActiveAccountIdCookie(accountToKeep.id);
    return { cleaned: false, keptAccountId: accountToKeep.id, deletedAccountIds: [] };
  }

  const deletedIds: number[] = [];
  const now = new Date().toISOString();

  for (const account of accountsToDelete) {
    const { error: deleteError } = await admin
      .from('budget_accounts')
      .update({ deleted_at: now })
      .eq('id', account.id)
      .eq('owner_id', user.id);

    if (deleteError) {
      console.error(`Failed to delete duplicate account ${account.id}:`, deleteError);
      continue;
    }

    await admin.from('account_users').delete().eq('account_id', account.id);
    deletedIds.push(account.id);
  }

  await setActiveAccountIdCookie(accountToKeep.id);

  return {
    cleaned: deletedIds.length > 0,
    keptAccountId: accountToKeep.id,
    deletedAccountIds: deletedIds,
  };
}

/**
 * Set the active account ID (stores in cookie)
 * This function verifies access and sets the cookie
 * Must be called from a route handler context where cookies() is available
 */
export async function setActiveAccountId(accountId: number): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Verify user has access to this account
  const { data } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();
  
  if (!data) {
    // Check if user is owner
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('owner_id', user.id)
      .single();
    
    if (!account) {
      throw new Error('Unauthorized: User does not have access to this account');
    }
  }
  
  // Set the cookie
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ACCOUNT_COOKIE, accountId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

/**
 * Set the active account ID cookie without verification
 * Use this when you've already verified access (e.g., after creating account or accepting invitation)
 * Must be called from a route handler context where cookies() is available
 */
export async function setActiveAccountIdCookie(accountId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ACCOUNT_COOKIE, accountId.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

/**
 * Get all accounts the user belongs to
 */
export async function getUserAccounts(): Promise<AccountMembership[]> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Get owned accounts first (owners might not be in account_users)
  const { data: ownedAccounts } = await supabase
    .from('budget_accounts')
    .select('id, public_id, name, owner_id')
    .eq('owner_id', user.id)
    .is('deleted_at', null);
  
  // Get account_users entries for this user
  const { data: accountUsers } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active');
  
  const memberships: AccountMembership[] = [];
  const ownedAccountIds = new Set<number>();
  
  // Add owned accounts first
  if (ownedAccounts && ownedAccounts.length > 0) {
    for (const account of ownedAccounts) {
      ownedAccountIds.add(account.id);
      memberships.push({
        accountId: account.id,
        accountPublicId: account.public_id,
        role: 'owner',
        accountName: account.name || 'My Budget',
        isOwner: true,
      });
    }
  }
  
  // Add shared accounts (where user is a member but not owner)
  // Optimize: Fetch all account details in a single query instead of N queries
  if (accountUsers && accountUsers.length > 0) {
    const sharedAccountIds = accountUsers
      .map(au => au.account_id)
      .filter(id => !ownedAccountIds.has(id));
    
    if (sharedAccountIds.length > 0) {
      // Fetch all shared account details in one query
      const { data: sharedAccounts } = await supabase
        .from('budget_accounts')
        .select('id, public_id, name, owner_id')
        .in('id', sharedAccountIds)
        .is('deleted_at', null);
      
      // Create a map for quick lookup
      const accountMap = new Map<number, { id: number; public_id: string; name: string | null; owner_id: string }>();
      sharedAccounts?.forEach(account => {
        accountMap.set(account.id, account);
      });
      
      // Add shared accounts to memberships
      for (const au of accountUsers) {
        // Skip if already added as owned account
        if (ownedAccountIds.has(au.account_id)) {
          continue;
        }
        
        const account = accountMap.get(au.account_id);
        if (account) {
          memberships.push({
            accountId: au.account_id,
            accountPublicId: account.public_id,
            role: au.role as 'owner' | 'editor' | 'viewer',
            accountName: account.name || 'Unknown Account',
            isOwner: account.owner_id === user.id,
          });
        }
      }
    }
  }
  
  return memberships;
}

/**
 * Check if user owns any accounts
 */
export async function userHasOwnAccount(): Promise<boolean> {
  const { supabase, user } = await getAuthenticatedUser();
  
  const { count } = await supabase
    .from('budget_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .is('deleted_at', null);
  
  return (count || 0) > 0;
}

/**
 * Get total count of accounts user belongs to (owned + shared)
 */
export async function getUserAccountCount(): Promise<number> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Count owned accounts
  const { count: ownedCount } = await supabase
    .from('budget_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .is('deleted_at', null);
  
  // Count shared accounts
  const { count: sharedCount } = await supabase
    .from('account_users')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active');
  
  return (ownedCount || 0) + (sharedCount || 0);
}

/**
 * Get account details by ID
 */
export async function getAccountById(accountId: number): Promise<{
  id: number;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
} | null> {
  const { supabase } = await getAuthenticatedUser();
  
  const { data, error } = await supabase
    .from('budget_accounts')
    .select('*')
    .eq('id', accountId)
    .is('deleted_at', null)
    .single();
  
  if (error || !data) return null;
  
  return data;
}

/**
 * Check if user has access to an account
 */
export async function userHasAccountAccess(accountId: number): Promise<boolean> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Check if user is owner
  const { data: account } = await supabase
    .from('budget_accounts')
    .select('id')
    .eq('id', accountId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .single();
  
  if (account) return true;
  
  // Check if user is member
  const { data: member } = await supabase
    .from('account_users')
    .select('id')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();
  
  return !!member;
}

/**
 * Check if user has write access to an account
 */
export async function userHasAccountWriteAccess(accountId: number): Promise<boolean> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Check if user is owner
  const { data: account } = await supabase
    .from('budget_accounts')
    .select('id')
    .eq('id', accountId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .single();
  
  if (account) return true;
  
  // Check if user is editor or owner
  const { data: member } = await supabase
    .from('account_users')
    .select('role')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'editor'])
    .single();
  
  return !!member;
}


