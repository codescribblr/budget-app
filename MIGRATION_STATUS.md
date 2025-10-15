# 🚧 Supabase Migration Status

This document tracks the progress of migrating from SQLite to Supabase.

---

## ✅ Completed

### **Infrastructure**
- [x] Installed Supabase packages (`@supabase/supabase-js`, `@supabase/ssr`)
- [x] Created Supabase client utilities (`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`)
- [x] Created middleware for route protection (`src/middleware.ts`)
- [x] Updated environment variables template (`.env.local.example`)

### **Authentication**
- [x] Created login page (`src/app/login/page.tsx`)
- [x] Created signup page (`src/app/signup/page.tsx`)
- [x] Created auth callback route (`src/app/auth/callback/route.ts`)

### **Database**
- [x] Created complete database schema (`supabase-schema.sql`)
- [x] Added Row Level Security (RLS) policies
- [x] Added indexes for performance
- [x] Added user_id to all tables

### **Documentation**
- [x] Created deployment guide (`SUPABASE_DEPLOYMENT_GUIDE.md`)
- [x] Created migration guide (`SUPABASE_MIGRATION.md`)

---

## 🚧 Remaining Work

The following components still need to be migrated from SQLite to Supabase:

### **API Routes** (Need Migration)

All API routes in `src/app/api/` need to be updated to:
1. Use Supabase client instead of SQLite
2. Add authentication checks
3. Filter queries by `user_id`

**Files to migrate:**
- [ ] `src/app/api/categories/route.ts`
- [ ] `src/app/api/categories/[id]/route.ts`
- [ ] `src/app/api/categories/reorder/route.ts`
- [ ] `src/app/api/accounts/route.ts`
- [ ] `src/app/api/accounts/[id]/route.ts`
- [ ] `src/app/api/credit-cards/route.ts`
- [ ] `src/app/api/credit-cards/[id]/route.ts`
- [ ] `src/app/api/pending-checks/route.ts`
- [ ] `src/app/api/pending-checks/[id]/route.ts`
- [ ] `src/app/api/transactions/route.ts`
- [ ] `src/app/api/transactions/[id]/route.ts`
- [ ] `src/app/api/reports/spending-by-category/route.ts`
- [ ] `src/app/api/reports/transactions-by-merchant/route.ts`
- [ ] `src/app/api/import/transactions/route.ts`
- [ ] `src/app/api/import/parse-csv/route.ts`
- [ ] `src/app/api/import/parse-image/route.ts`
- [ ] `src/app/api/merchant-mappings/route.ts`
- [ ] `src/app/api/merchant-mappings/[id]/route.ts`
- [ ] `src/app/api/envelopes/transfer/route.ts`
- [ ] `src/app/api/envelopes/allocate/route.ts`

### **Page Components** (Need Migration)

All page components need to be updated to:
1. Use Supabase server client
2. Add authentication checks
3. Redirect to login if not authenticated

**Files to migrate:**
- [ ] `src/app/page.tsx` (Dashboard)
- [ ] All other pages (if any)

### **Utility Functions** (Need Migration)

- [ ] `src/lib/db.ts` - Remove or replace with Supabase utilities
- [ ] Any other database utility functions

---

## 🔄 Migration Pattern

### **For API Routes:**

**Before (SQLite):**
```typescript
import db from '@/lib/db';

export async function GET() {
  const categories = db.prepare('SELECT * FROM categories').all();
  return NextResponse.json(categories);
}
```

**After (Supabase):**
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Query with automatic user_id filtering (thanks to RLS)
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(categories);
}
```

### **For Page Components:**

**Before (SQLite):**
```typescript
import db from '@/lib/db';

export default function DashboardPage() {
  const categories = db.prepare('SELECT * FROM categories').all();
  return <div>{/* render */}</div>;
}
```

**After (Supabase):**
```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  
  // Query with automatic user_id filtering (thanks to RLS)
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  
  return <div>{/* render */}</div>;
}
```

---

## 📝 Key Changes Summary

### **1. Import Changes**
```typescript
// OLD:
import db from '@/lib/db';

// NEW:
import { createClient } from '@/lib/supabase/server'; // For server components/routes
import { createClient } from '@/lib/supabase/client'; // For client components
```

### **2. Authentication Checks**
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### **3. Query Syntax**
```typescript
// OLD:
const result = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

// NEW:
const { data, error } = await supabase
  .from('categories')
  .select('*')
  .eq('id', id)
  .single();
```

### **4. Insert Syntax**
```typescript
// OLD:
const stmt = db.prepare('INSERT INTO categories (name, user_id) VALUES (?, ?)');
const result = stmt.run(name, userId);

// NEW:
const { data, error } = await supabase
  .from('categories')
  .insert({ name, user_id: user.id })
  .select()
  .single();
```

### **5. Update Syntax**
```typescript
// OLD:
const stmt = db.prepare('UPDATE categories SET name = ? WHERE id = ?');
stmt.run(name, id);

// NEW:
const { data, error } = await supabase
  .from('categories')
  .update({ name })
  .eq('id', id)
  .select()
  .single();
```

### **6. Delete Syntax**
```typescript
// OLD:
const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
stmt.run(id);

// NEW:
const { error } = await supabase
  .from('categories')
  .delete()
  .eq('id', id);
```

---

## 🎯 Next Steps

**Option 1: I can migrate all the code for you**
- I'll update all API routes and pages to use Supabase
- This will take some time but will be complete

**Option 2: You can follow the deployment guide**
- Set up Supabase project
- Run the schema SQL
- Test authentication locally
- Then I can help migrate the remaining code

**Option 3: Hybrid approach**
- You set up Supabase and test auth
- I migrate the code while you're testing
- We verify together

Which approach would you prefer?

---

## ⚠️ Important Notes

1. **Don't delete SQLite code yet** - Keep it as reference until migration is complete
2. **Test each route** - After migrating, test to ensure it works
3. **User ID is automatic** - RLS policies handle user_id filtering automatically
4. **No need to manually add user_id** - Supabase adds it based on auth.uid()
5. **Error handling** - Always check for `error` in Supabase responses

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **Supabase JS Client**: https://supabase.com/docs/reference/javascript
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Next.js + Supabase**: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

