import { getAuthenticatedUser } from './supabase-queries';
import { cookies } from 'next/headers';

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
 */
export async function getActiveAccountId(): Promise<number | null> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Try to read from cookie first
  try {
    const cookieStore = await cookies();
    const activeAccountId = cookieStore.get(ACTIVE_ACCOUNT_COOKIE);
    if (activeAccountId?.value) {
      const accountId = parseInt(activeAccountId.value);
      if (!isNaN(accountId)) {
        // Basic validation - check if account exists and user has access
        const { data: account } = await supabase
          .from('budget_accounts')
          .select('id, owner_id')
          .eq('id', accountId)
          .is('deleted_at', null)
          .single();
        
        if (account) {
          // Check if user is owner or member
          if (account.owner_id === user.id) {
            return accountId;
          }
          
          const { data: member } = await supabase
            .from('account_users')
            .select('id')
            .eq('account_id', accountId)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
          
          if (member) {
            return accountId;
          }
        }
      }
    }
  } catch (error) {
    // Cookie not available, continue to fallback
  }
  
  // Fallback: Get user's primary account
  // Get user's accounts (both owned and shared)
  const { data: accountUsers } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('role', { ascending: true }); // owners first
  
  // If no shared accounts, check if user owns any accounts
  if (!accountUsers || accountUsers.length === 0) {
    const { data: ownedAccounts } = await supabase
      .from('budget_accounts')
      .select('id')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .limit(1);
    
    return ownedAccounts?.[0]?.id || null;
  }
  
  return accountUsers[0].account_id;
}

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
  
  // Get shared accounts
  const { data: accountUsers } = await supabase
    .from('account_users')
    .select(`
      account_id,
      role,
      account:budget_accounts (
        id,
        name,
        owner_id
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');
  
  // Get owned accounts
  const { data: ownedAccounts } = await supabase
    .from('budget_accounts')
    .select('id, name, owner_id')
    .eq('owner_id', user.id)
    .is('deleted_at', null);
  
  const memberships: AccountMembership[] = [];
  
  // Add shared accounts
  if (accountUsers) {
    for (const au of accountUsers) {
      if (au.account) {
        memberships.push({
          accountId: au.account_id,
          role: au.role as 'owner' | 'editor' | 'viewer',
          accountName: au.account.name,
          isOwner: au.account.owner_id === user.id,
        });
      }
    }
  }
  
  // Add owned accounts (avoid duplicates)
  if (ownedAccounts) {
    for (const account of ownedAccounts) {
      if (!memberships.find(m => m.accountId === account.id)) {
        memberships.push({
          accountId: account.id,
          role: 'owner',
          accountName: account.name,
          isOwner: true,
        });
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

