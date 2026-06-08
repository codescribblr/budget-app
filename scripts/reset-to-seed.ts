import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const dbPath = path.join(process.cwd(), 'database', 'budget.db');
const backupDir = path.join(process.cwd(), 'database', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Create backups directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Backup current database if it exists
if (fs.existsSync(dbPath)) {
  const backupPath = path.join(backupDir, `budget-before-reset-${timestamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  console.log(`📦 Current database backed up to: budget-before-reset-${timestamp}.db`);
  
  // Delete current database
  fs.unlinkSync(dbPath);
  console.log('🗑️  Current database deleted');
}

// Run seed script
console.log('🌱 Reseeding database with initial data...');
execSync('npx tsx scripts/seed.ts', { stdio: 'inherit' });

console.log('\n✅ Database reset to initial seed data!');
console.log('💡 Your previous database was backed up in database/backups/');


