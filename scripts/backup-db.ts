import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'budget.db');
const backupDir = path.join(process.cwd(), 'database', 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `budget-backup-${timestamp}.db`);

// Create backups directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Copy database file
if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Database backed up to: ${backupPath}`);
  console.log(`📁 Backup location: database/backups/budget-backup-${timestamp}.db`);
} else {
  console.error('❌ Database file not found!');
  process.exit(1);
}

