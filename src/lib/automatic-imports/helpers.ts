/**
 * Helper functions for automatic imports
 */

import { decrypt } from '@/lib/encryption';
import type { AutomaticImportSetup } from './types';

/**
 * Get decrypted access token from an import setup
 * Returns null if no access token is found or decryption fails
 */
export function getDecryptedAccessToken(setup: AutomaticImportSetup): string | null {
  if (!setup.source_config?.access_token) {
    return null;
  }

  try {
    const encryptedToken = setup.source_config.access_token;
    
    // Decrypt the token
    return decrypt(encryptedToken);
  } catch (error: any) {
    console.error(`Failed to decrypt access token for setup ${setup.id}:`, error.message);
    return null;
  }
}

