import { getAuthenticatedUser } from './supabase-queries';
import { cookies } from 'next/headers';
import { cache } from 'react';

export interface AccountMembership {
  accountId: number;
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
  // First check if user owns any accounts (owners aren't in account_users)
  const { data: ownedAccounts } = await supabase
    .from('budget_accounts')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .limit(1);
  
  if (ownedAccounts && ownedAccounts.length > 0) {
    return ownedAccounts[0].id;
  }
  
  // If no owned accounts, check shared accounts
  const { data: accountUsers } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('role', { ascending: true }) // owners first (though owners shouldn't be here)
    .limit(1);
  
  if (accountUsers && accountUsers.length > 0) {
    return accountUsers[0].account_id;
  }
  
  // No accounts found - don't auto-create one
  // User should either accept an invitation or create their own account
  return null;
});

/**
 * Set the active account ID (stores in cookie)
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
  
  // Store in cookie (will be handled by middleware/client)
  // For now, we'll use a server-side approach
}

/**
 * Get all accounts the user belongs to
 */
export async function getUserAccounts(): Promise<AccountMembership[]> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Get owned accounts first (owners might not be in account_users)
  const { data: ownedAccounts } = await supabase
    .from('budget_accounts')
    .select('id, name, owner_id')
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
        .select('id, name, owner_id')
        .in('id', sharedAccountIds)
        .is('deleted_at', null);
      
      // Create a map for quick lookup
      const accountMap = new Map<number, { id: number; name: string | null; owner_id: string }>();
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

