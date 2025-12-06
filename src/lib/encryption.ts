/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment variable
 * Falls back to a default key if not set (for development only)
 * In production, ENCRYPTION_KEY must be set!
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is required in production');
    }
    // Development fallback - warn but allow
    console.warn('⚠️  ENCRYPTION_KEY not set. Using default key for development. Set ENCRYPTION_KEY in production!');
    // Use a deterministic key for development (DO NOT USE IN PRODUCTION)
    return crypto.scryptSync('development-key-change-in-production', 'salt', KEY_LENGTH);
  }

  // Key should be a hex-encoded 64-character string (32 bytes = 256 bits)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }

  try {
    return Buffer.from(key, 'hex');
  } catch (error) {
    throw new Error('ENCRYPTION_KEY must be a valid hex string');
  }
}

/**
 * Encrypt a string value
 * Returns a hex-encoded string containing: salt + iv + tag + encrypted data
 */
export function encrypt(value: string): string {
  if (!value) {
    throw new Error('Cannot encrypt empty value');
  }

  const key = getEncryptionKey();
  
  // Generate random salt and IV for each encryption
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive key from master key and salt
  const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  
  // Encrypt
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag
  const tag = cipher.getAuthTag();
  
  // Combine: salt + iv + tag + encrypted data
  const combined = Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex'),
  ]);
  
  return combined.toString('hex');
}

/**
 * Decrypt a hex-encoded encrypted string
 * Expects format: salt + iv + tag + encrypted data
 */
export function decrypt(encryptedHex: string): string {
  if (!encryptedHex) {
    throw new Error('Cannot decrypt empty value');
  }

  const key = getEncryptionKey();
  
  try {
    // Parse hex string
    const combined = Buffer.from(encryptedHex, 'hex');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key from master key and salt
    const derivedKey = crypto.scryptSync(key, salt, KEY_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generate a random encryption key (for initial setup)
 * Returns a hex-encoded 64-character string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
