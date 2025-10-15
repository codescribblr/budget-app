# Supabase Migration Guide - Technical Implementation

This guide provides detailed technical steps to migrate your budget app from SQLite to Supabase with full authentication and security.

---

## 📋 Prerequisites

1. **Supabase Account** (free)
   - Sign up at https://supabase.com
   - Create a new project
   - Note your project URL and API keys

2. **GitHub Account** (for Vercel deployment)
   - Push your code to GitHub repository

3. **Vercel Account** (free)
   - Sign up at https://vercel.com
   - Connect to GitHub

---

## 🗄️ Part 1: Database Schema Migration

### **Step 1: Create Supabase Tables**

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  monthly_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit cards table
CREATE TABLE credit_cards (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pending checks table
CREATE TABLE pending_checks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  check_number TEXT NOT NULL,
  payee TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transaction splits table
CREATE TABLE transaction_splits (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL
);

-- Merchant mappings table (for smart categorization)
CREATE TABLE merchant_mappings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  merchant_pattern TEXT NOT NULL,
  normalized_merchant TEXT NOT NULL,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  confidence_score INTEGER DEFAULT 1,
  last_used TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imported transactions table
CREATE TABLE imported_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  import_hash TEXT NOT NULL UNIQUE,
  date TEXT NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  source_type TEXT NOT NULL,
  source_data TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imported transaction links table
CREATE TABLE imported_transaction_links (
  id BIGSERIAL PRIMARY KEY,
  imported_transaction_id BIGINT REFERENCES imported_transactions(id) ON DELETE CASCADE NOT NULL,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_pending_checks_user_id ON pending_checks(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);
CREATE INDEX idx_transaction_splits_category_id ON transaction_splits(category_id);
CREATE INDEX idx_merchant_mappings_user_id ON merchant_mappings(user_id);
CREATE INDEX idx_merchant_mappings_normalized ON merchant_mappings(normalized_merchant);
CREATE INDEX idx_imported_transactions_user_id ON imported_transactions(user_id);
CREATE INDEX idx_imported_transactions_hash ON imported_transactions(import_hash);
```

### **Step 2: Enable Row Level Security (RLS)**

```sql
-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_transaction_links ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Accounts policies
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Credit cards policies
CREATE POLICY "Users can view own credit cards" ON credit_cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit cards" ON credit_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit cards" ON credit_cards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit cards" ON credit_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Pending checks policies
CREATE POLICY "Users can view own pending checks" ON pending_checks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pending checks" ON pending_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own pending checks" ON pending_checks
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Transaction splits policies (inherit from transaction)
CREATE POLICY "Users can view own transaction splits" ON transaction_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own transaction splits" ON transaction_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own transaction splits" ON transaction_splits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_splits.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Merchant mappings policies
CREATE POLICY "Users can view own merchant mappings" ON merchant_mappings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own merchant mappings" ON merchant_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own merchant mappings" ON merchant_mappings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own merchant mappings" ON merchant_mappings
  FOR DELETE USING (auth.uid() = user_id);

-- Imported transactions policies
CREATE POLICY "Users can view own imported transactions" ON imported_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own imported transactions" ON imported_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Imported transaction links policies
CREATE POLICY "Users can view own imported transaction links" ON imported_transaction_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM imported_transactions
      WHERE imported_transactions.id = imported_transaction_links.imported_transaction_id
      AND imported_transactions.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own imported transaction links" ON imported_transaction_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM imported_transactions
      WHERE imported_transactions.id = imported_transaction_links.imported_transaction_id
      AND imported_transactions.user_id = auth.uid()
    )
  );
```

---

## 🔧 Part 2: Code Migration

### **Step 1: Install Supabase Dependencies**

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### **Step 2: Create Supabase Client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting errors
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie removal errors
          }
        },
      },
    }
  )
}
```

### **Step 3: Update Environment Variables**

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

---

## 🔐 Part 3: Authentication

### **Step 1: Create Auth Pages**

This requires creating login, signup, and middleware files. Due to length, I'll provide the structure:

**Files to create:**
- `src/app/login/page.tsx` - Login page
- `src/app/signup/page.tsx` - Signup page  
- `src/app/auth/callback/route.ts` - OAuth callback
- `src/middleware.ts` - Route protection

---

## 📊 Part 4: Migration Strategy

### **Option A: Fresh Start (Recommended)**

1. Deploy new Supabase version
2. Users create new accounts
3. Manually migrate your data if needed

### **Option B: Data Migration**

1. Export SQLite data
2. Transform to include user_id
3. Import to Supabase
4. Requires custom migration script

---

## ✅ Summary

This migration involves:
- ✅ New database schema with user_id
- ✅ Row Level Security policies
- ✅ Supabase client setup
- ✅ Authentication system
- ✅ Protected routes and APIs

**Next Steps:**
Let me know if you want me to implement any specific part!

