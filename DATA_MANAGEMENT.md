# Data Management Guide

This guide explains how to manage your budget data between SQLite (local) and Supabase (production).

---

## 📊 Export SQLite Data to JSON

Export your local SQLite database to a JSON file:

```bash
cd budget-app
node scripts/export-sqlite-data.js
```

This creates `data-export.json` with:
- Categories (envelopes)
- Accounts
- Credit cards
- Pending checks
- Settings
- Merchant mappings

**Note:** Transactions are NOT exported (too much data). Only your configuration/setup is exported.

---

## 🗑️ Clear Production Test Data

Before importing your real data, clear any test data from your production account:

### **Step 1: Get Your User ID**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** > **Users**
4. Click on your user
5. Copy your **User UID** (e.g., `12345678-1234-1234-1234-123456789abc`)

### **Step 2: Get Your Service Role Key**

1. Go to **Project Settings** > **API**
2. Copy the **service_role** key (NOT the anon key!)
3. ⚠️ **Keep this secret!** Never commit it to git!

### **Step 3: Clear Your Data**

```bash
cd budget-app

export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
export USER_ID="12345678-1234-1234-1234-123456789abc"

node scripts/clear-user-data.js
```

When prompted, type `DELETE` to confirm.

---

## 📥 Import Data to Production

Import your exported data to your production Supabase account:

```bash
cd budget-app

export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
export USER_ID="12345678-1234-1234-1234-123456789abc"

node scripts/import-to-supabase.js
```

This will import:
- ✅ All categories with their balances
- ✅ All accounts with their balances
- ✅ All credit cards with their limits
- ✅ All pending checks
- ✅ All settings
- ✅ All merchant mappings (for auto-categorization)

---

## 🔄 Complete Workflow

Here's the complete workflow to migrate your data:

### **1. Export from SQLite**
```bash
node scripts/export-sqlite-data.js
```

### **2. Review the export**
```bash
cat data-export.json
```

### **3. Set environment variables**
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
export USER_ID="12345678-1234-1234-1234-123456789abc"
```

### **4. Clear test data (optional)**
```bash
node scripts/clear-user-data.js
# Type DELETE when prompted
```

### **5. Import to production**
```bash
node scripts/import-to-supabase.js
```

### **6. Verify in production**
Go to your production app and verify:
- Categories are there with correct balances
- Accounts are there with correct balances
- Credit cards are there with correct limits
- Settings are correct

---

## 🔐 Security Notes

### **Service Role Key**
- The service role key **bypasses Row Level Security (RLS)**
- It can access ALL data in your database
- **Never** commit it to git
- **Never** use it in client-side code
- Only use it in server-side scripts

### **Environment Variables**
To avoid typing them every time, you can add them to your shell profile:

```bash
# Add to ~/.zshrc or ~/.bashrc
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
export USER_ID="12345678-1234-1234-1234-123456789abc"
```

Then reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

---

## 📝 What Gets Exported/Imported

### ✅ Exported
- Categories (with balances and sort order)
- Accounts (with balances)
- Credit cards (with limits and balances)
- Pending checks
- Settings
- Merchant mappings

### ❌ NOT Exported
- Transactions (too much data, import via CSV instead)
- Transaction splits
- Imported transactions
- User authentication data

---

## 🆘 Troubleshooting

### **Error: User not found**
- Check your `USER_ID` is correct
- Make sure you copied the full UUID from Supabase

### **Error: Invalid API key**
- Make sure you're using the **service_role** key, not the **anon** key
- Check for extra spaces when copying the key

### **Error: data-export.json not found**
- Run `export-sqlite-data.js` first
- Make sure you're in the `budget-app` directory

### **Error: Permission denied**
- Make the scripts executable: `chmod +x scripts/*.js`
- Or run with `node` explicitly: `node scripts/export-sqlite-data.js`

---

## 💡 Tips

1. **Backup first**: Before clearing data, export it first
2. **Test with a new user**: Create a test account to try the import first
3. **Review the JSON**: Check `data-export.json` before importing
4. **One user at a time**: These scripts work for one user at a time

---

## 🎯 Quick Reference

```bash
# Export SQLite → JSON
node scripts/export-sqlite-data.js

# Clear production data
node scripts/clear-user-data.js

# Import JSON → Supabase
node scripts/import-to-supabase.js
```

---

**Ready to migrate your data!** 🚀

