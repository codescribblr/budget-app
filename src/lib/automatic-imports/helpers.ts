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
    
    // Check if token is already encrypted (hex string) or plain text (for migration)
    // Encrypted tokens are hex strings, plain tokens start with "token_"
    if (typeof encryptedToken === 'string' && encryptedToken.startsWith('token_')) {
      // Plain text token (legacy) - return as-is but warn
      console.warn(`⚠️  Found plain text access token for setup ${setup.id}. Please re-connect to encrypt.`);
      return encryptedToken;
    }
    
    // Try to decrypt
    return decrypt(encryptedToken);
  } catch (error: any) {
    console.error(`Failed to decrypt access token for setup ${setup.id}:`, error.message);
    return null;
  }
}
