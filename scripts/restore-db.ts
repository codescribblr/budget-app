import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'budget.db');
const backupDir = path.join(process.cwd(), 'database', 'backups');

// Get backup file from command line argument or use latest
const backupFile = process.argv[2];

if (backupFile) {
  // Restore specific backup
  const backupPath = path.join(backupDir, backupFile);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    console.log('\nAvailable backups:');
    if (fs.existsSync(backupDir)) {
      const backups = fs.readdirSync(backupDir).filter(f => f.endsWith('.db'));
      backups.forEach(b => console.log(`  - ${b}`));
    }
    process.exit(1);
  }
  
  fs.copyFileSync(backupPath, dbPath);
  console.log(`✅ Database restored from: ${backupFile}`);
} else {
  // List available backups
  console.log('Available backups:');
  if (fs.existsSync(backupDir)) {
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .sort()
      .reverse();
    
    if (backups.length === 0) {
      console.log('  No backups found.');
    } else {
      backups.forEach((b, i) => {
        const stats = fs.statSync(path.join(backupDir, b));
        console.log(`  ${i + 1}. ${b} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
      });
      console.log('\nUsage: npm run restore-db <backup-filename>');
    }
  } else {
    console.log('  No backups directory found.');
  }
}


