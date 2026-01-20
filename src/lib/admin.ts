/**
 * Admin utility functions for checking admin status and permissions
 */

import { getAuthenticatedUser } from './supabase-queries';
import { cache } from 'react';

/**
 * Check if the current user is an admin
 * Uses React's cache() for request-scoped memoization
 */
export const isAdmin = cache(async (): Promise<boolean> => {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      // Log error for debugging
      console.error('[isAdmin] Error fetching user profile:', error);
      return false;
    }
    
    if (!data) {
      // Profile doesn't exist
      return false;
    }
    
    return data.is_admin === true;
  } catch (error) {
    // If authentication fails, user is not admin
    console.error('[isAdmin] Exception:', error);
    return false;
  }
});

/**
 * Require admin access - throws error if user is not admin
 * Returns user object for convenience
 * Use this in API routes and server components
 */
export async function requireAdmin(): Promise<{ user: { id: string } }> {
  const { user } = await getAuthenticatedUser();
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }
  return { user };
}

/**
 * Get admin status for a specific user ID
 * Requires admin privileges to check other users
 */
export async function getUserAdminStatus(userId: string): Promise<boolean> {
  // First check if current user is admin
  const currentUserIsAdmin = await isAdmin();
  if (!currentUserIsAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  const { supabase } = await getAuthenticatedUser();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return false;
  }
  
  return data.is_admin === true;
}

/**
 * Set admin status for a user
 * Requires admin privileges
 */
export async function setUserAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
  // First check if current user is admin
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  const { supabase } = await getAuthenticatedUser();
  
  // First, ensure profile exists
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', userId)
    .single();
  
  if (!existingProfile) {
    // Create profile if it doesn't exist
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        is_admin: isAdmin,
      });
    
    if (insertError) {
      throw new Error(`Failed to create user profile: ${insertError.message}`);
    }
  } else {
    // Update existing profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ is_admin: isAdmin })
      .eq('user_id', userId);
    
    if (updateError) {
      throw new Error(`Failed to update admin status: ${updateError.message}`);
    }
  }
}
