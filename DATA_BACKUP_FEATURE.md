# Data Backup Feature

## Overview

The Data Backup feature allows users to create, manage, and restore backups of their budget data directly from the application. This is an in-app backup system that stores user data as JSON within the database.

## Features

### ✅ Create Backups
- Users can create backups of all their budget data with a single click
- Each backup captures a complete snapshot of:
  - Accounts
  - Categories (budget envelopes)
  - Credit cards
  - Transactions and transaction splits
  - Merchant groups and mappings
  - Pending checks
  - Income settings
  - Pre-tax deductions

### ✅ Backup Limit
- Maximum of 3 backups per user
- If a user tries to create a 4th backup, they'll see an error message
- Users must delete an old backup before creating a new one

### ✅ View Backups
- Backups are displayed in a list with:
  - Date and time of creation
  - Backup ID
  - Restore and Delete buttons

### ✅ Delete Backups
- Users can delete any of their backups
- Deletion is instant with a confirmation toast

### ✅ Restore from Backup
- Users can restore their data from any backup
- **Safety Feature:** Requires typing "restore" to confirm
- **Warning:** Restoring will DELETE all current data and replace it with the backup
- After restore, the page automatically refreshes to show the restored data

## User Interface

The Data Backup section is located in **Settings** (`/settings`), positioned between the Merchant Grouping section and the Password section.

### UI Components:
1. **Create Backup Button** - Creates a new backup
2. **Backup Counter** - Shows "X/3 backups used"
3. **Backup List** - Shows all backups with date/time
4. **Restore Button** - Opens confirmation dialog
5. **Delete Button** - Deletes the backup
6. **Restore Confirmation Dialog** - Requires typing "restore" to proceed

## Technical Implementation

### Database Schema

**Table:** `user_backups`
```sql
CREATE TABLE user_backups (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  backup_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLS Policies:**
- Users can only view their own backups
- Users can only create their own backups
- Users can only delete their own backups

### API Endpoints

1. **GET /api/backups**
   - Lists all backups for the authenticated user
   - Returns: `{ backups: [{ id, created_at }] }`

2. **POST /api/backups**
   - Creates a new backup
   - Validates 3-backup limit
   - Returns: `{ backup: { id, created_at } }`
   - Error: `{ error: "Maximum of 3 backups allowed..." }` (400)

3. **DELETE /api/backups/[id]**
   - Deletes a specific backup
   - Returns: `{ success: true }`

4. **POST /api/backups/[id]/restore**
   - Restores data from a specific backup
   - Deletes all current user data
   - Inserts backup data
   - Returns: `{ success: true }`

### Utility Functions

**File:** `src/lib/backup-utils.ts`

1. **exportUserData()**
   - Fetches all user data from all tables
   - Returns a JSON object with version and data

2. **importUserData(backupData)**
   - Deletes all current user data (in dependency order)
   - Inserts backup data (in dependency order)
   - Handles foreign key constraints properly

### Components

**File:** `src/components/settings/DataBackup.tsx`
- Main UI component for the backup feature
- Handles all user interactions
- Manages loading states and error handling
- Implements the "type restore to confirm" safety feature

## Usage Instructions

### Creating a Backup

1. Go to **Settings** page
2. Scroll to the **Data Backup** section
3. Click **Create Backup**
4. Wait for the success message
5. Your backup will appear in the list below

### Restoring from a Backup

1. Go to **Settings** page
2. Scroll to the **Data Backup** section
3. Find the backup you want to restore
4. Click the **Restore** button
5. Read the warning carefully
6. Type **restore** in the confirmation field
7. Click **Restore Backup**
8. Wait for the page to refresh

⚠️ **Warning:** Restoring will permanently delete all your current data!

### Deleting a Backup

1. Go to **Settings** page
2. Scroll to the **Data Backup** section
3. Find the backup you want to delete
4. Click the **Delete** button (trash icon)
5. The backup will be deleted immediately

## Use Cases

### 1. Before Major Changes
Create a backup before:
- Importing large datasets
- Testing new features
- Making bulk edits
- Experimenting with data

### 2. Regular Snapshots
Create periodic backups to:
- Preserve important milestones
- Have restore points for different time periods
- Protect against accidental data loss

### 3. Data Recovery
Restore from a backup to:
- Undo unwanted changes
- Recover from mistakes
- Return to a known good state

## Differences from Database-Level Backups

This feature is different from the database-level backup scripts (`backup-supabase.sh`):

| Feature | In-App Backup | Database Backup |
|---------|---------------|-----------------|
| **Scope** | User data only | Entire database |
| **Storage** | In database (JSONB) | SQL file on disk |
| **Access** | Through UI | Command line |
| **Limit** | 3 per user | Unlimited |
| **Speed** | Fast (JSON) | Slower (SQL dump) |
| **Use Case** | Quick snapshots | Full system backup |

## Security

- All backups are protected by Row Level Security (RLS)
- Users can only access their own backups
- Authentication required for all operations
- Backup data is stored securely in the database

## Future Enhancements

Potential improvements:
- Download backup as JSON file
- Upload backup from JSON file
- Backup notes/descriptions
- Automatic scheduled backups
- Backup size display
- Selective restore (restore only specific tables)

