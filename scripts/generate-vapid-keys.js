#!/usr/bin/env node

/**
 * Generate VAPID keys for push notifications
 * 
 * Usage:
 *   node scripts/generate-vapid-keys.js
 * 
 * This will output the public and private keys that you need to add to your environment variables.
 */

const webpush = require('web-push');

console.log('🔑 Generating VAPID keys for push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📋 Add these to your environment variables:\n');
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('VAPID_EMAIL=mailto:your-email@yourdomain.com');
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📝 Instructions:');
console.log('1. Copy the keys above');
console.log('2. Add them to Vercel: Project Settings → Environment Variables');
console.log('3. Add them to your local .env.local file for development');
console.log('4. The public key (NEXT_PUBLIC_VAPID_PUBLIC_KEY) is safe to expose');
console.log('5. The private key (VAPID_PRIVATE_KEY) must be kept secret\n');


