-- Migration: 001_initial_schema.sql
-- Description: Initial database schema with all tables and RLS policies
-- Date: 2025-01-15

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  monthly_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  account_type TEXT NOT NULL CHECK(account_type IN ('checking', 'savings', 'cash')),
  include_in_totals INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit cards table
CREATE TABLE IF NOT EXISTS credit_cards (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  available_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(10,2) NOT NULL DEFAULT 0,
  include_in_totals INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pending checks table
CREATE TABLE IF NOT EXISTS pending_checks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transaction splits table
CREATE TABLE IF NOT EXISTS transaction_splits (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Merchant mappings table
CREATE TABLE IF NOT EXISTS merchant_mappings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  merchant_pattern TEXT NOT NULL,
  normalized_merchant TEXT NOT NULL,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  confidence_score INTEGER DEFAULT 1,
  last_used TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Imported transactions table
CREATE TABLE IF NOT EXISTS imported_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  import_date TIMESTAMPTZ NOT NULL,
  source_file TEXT NOT NULL,
  source_institution TEXT,
  transaction_date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  original_data TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, hash)
);

-- Imported transaction links table
CREATE TABLE IF NOT EXISTS imported_transaction_links (
  id BIGSERIAL PRIMARY KEY,
  imported_transaction_id BIGINT NOT NULL REFERENCES imported_transactions(id) ON DELETE CASCADE,
  transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_checks_user_id ON pending_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_category_id ON transaction_splits(category_id);
CREATE INDEX IF NOT EXISTS idx_merchant_mappings_user_id ON merchant_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_mappings_normalized ON merchant_mappings(normalized_merchant);
CREATE INDEX IF NOT EXISTS idx_merchant_mappings_category ON merchant_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_imported_transactions_user_id ON imported_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_transactions_hash ON imported_transactions(hash);
CREATE INDEX IF NOT EXISTS idx_imported_transaction_links_imported ON imported_transaction_links(imported_transaction_id);
CREATE INDEX IF NOT EXISTS idx_imported_transaction_links_transaction ON imported_transaction_links(transaction_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for accounts
CREATE POLICY "Users can view their own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for credit_cards
CREATE POLICY "Users can view their own credit cards" ON credit_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own credit cards" ON credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own credit cards" ON credit_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own credit cards" ON credit_cards FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pending_checks
CREATE POLICY "Users can view their own pending checks" ON pending_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own pending checks" ON pending_checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pending checks" ON pending_checks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pending checks" ON pending_checks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for merchant_mappings
CREATE POLICY "Users can view their own merchant mappings" ON merchant_mappings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own merchant mappings" ON merchant_mappings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own merchant mappings" ON merchant_mappings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own merchant mappings" ON merchant_mappings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for imported_transactions
CREATE POLICY "Users can view their own imported transactions" ON imported_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own imported transactions" ON imported_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own imported transactions" ON imported_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own imported transactions" ON imported_transactions FOR DELETE USING (auth.uid() = user_id);

-- Transaction splits inherit permissions from transactions (no user_id column)
-- Imported transaction links inherit permissions from imported_transactions (no user_id column)

