# Multi-User Collaboration Feature Plan

## Overview
Enable multiple users to collaborate on a single budget account. This feature allows married couples, families, or business partners to manage their finances together while maintaining separate login credentials. Each user can be invited to multiple accounts and switch between them seamlessly.

---

## 🎯 Core Requirements

### Primary Use Cases
1. **Married Couples** - Both spouses can manage the same budget with their own login
2. **Family Budgets** - Parents can invite children to view/manage family finances
3. **Business Partners** - Multiple partners can collaborate on business finances
4. **Accountants/Advisors** - Financial advisors can be granted read-only access

### Key Features
- ✅ Invite users by email to join an account
- ✅ Set permissions per user (read-only or editor)
- ✅ Multiple users can collaborate on the same account
- ✅ Users can be members of multiple accounts
- ✅ Account switcher UI to choose active account
- ✅ Users can remove themselves from an account
- ✅ Account owner can remove collaborators
- ✅ Account owner cannot be removed (protect primary account)
- ✅ When accepting invitation, user does NOT automatically get their own account
- ✅ Account switcher includes option to "Create My Own Account" if user doesn't have one
- ✅ User can only delete their account if they have NO accounts (owned or shared)

---

## 🏗️ Technical Architecture

### Core Concepts

#### 1. Account vs User
- **Current State**: Each user has their own isolated data (user_id = account)
- **New State**: 
  - `budget_accounts` table represents a shared budget workspace
  - Multiple users can be members of a single account
  - Each user can belong to multiple accounts
  - One user is the "owner" of each account (cannot be removed)

#### 2. Permission Levels
- **owner**: Full control, can delete account, manage members, change permissions
- **editor**: Can view, create, update, delete all data (except account deletion)
- **viewer**: Can only view data, cannot make changes

#### 3. Account Context
- Users must select an "active account" to work within
- All queries filter by active account instead of user_id
- Account context stored in session/cookie/localStorage
- Default to user's "primary account" (first account they own or are member of)
- **Important**: Users can exist without owning their own account (they may only be members of shared accounts)
- Users without their own account see "Create My Own Account" option in account switcher

---

## 📊 Database Schema Changes

### New Table: `budget_accounts`
Represents a shared budget workspace that multiple users can access.

```sql
CREATE TABLE budget_accounts (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Smith Family Budget", "John & Jane's Budget"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete support
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(id)
);

-- Indexes
CREATE INDEX idx_budget_accounts_owner_id ON budget_accounts(owner_id);
CREATE INDEX idx_budget_accounts_deleted_at ON budget_accounts(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE budget_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view accounts they are members of
CREATE POLICY "Users can view accounts they belong to"
  ON budget_accounts FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_users
      WHERE account_users.account_id = budget_accounts.id
      AND account_users.user_id = auth.uid()
      AND account_users.status = 'active'
    )
  );

-- Only owners can update their accounts
CREATE POLICY "Owners can update their accounts"
  ON budget_accounts FOR UPDATE
  USING (owner_id = auth.uid());

-- Only owners can delete their accounts (soft delete)
CREATE POLICY "Owners can delete their accounts"
  ON budget_accounts FOR DELETE
  USING (owner_id = auth.uid());
```

### New Table: `account_users`
Junction table linking users to accounts with their permissions.

```sql
CREATE TABLE account_users (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permission level
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  
  -- Invitation tracking
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(account_id, user_id),
  
  -- Ensure at least one owner per account
  CONSTRAINT account_has_owner CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_users.account_id
      AND au.role = 'owner'
      AND au.status = 'active'
    )
  )
);

-- Indexes
CREATE INDEX idx_account_users_account_id ON account_users(account_id);
CREATE INDEX idx_account_users_user_id ON account_users(user_id);
CREATE INDEX idx_account_users_status ON account_users(status);
CREATE INDEX idx_account_users_role ON account_users(account_id, role);

-- RLS Policies
ALTER TABLE account_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own account memberships
CREATE POLICY "Users can view their account memberships"
  ON account_users FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_users.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );

-- Owners can insert new members
CREATE POLICY "Owners can add members"
  ON account_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_users.account_id
      AND au.user_id = auth.uid()
      AND au.role = 'owner'
      AND au.status = 'active'
    )
  );

-- Owners can update member permissions
CREATE POLICY "Owners can update member permissions"
  ON account_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_users.account_id
      AND au.user_id = auth.uid()
      AND au.role = 'owner'
      AND au.status = 'active'
    )
    -- Prevent changing owner role
    AND (role = 'owner' OR OLD.role = 'owner')
  );

-- Owners can remove members (except themselves)
CREATE POLICY "Owners can remove members"
  ON account_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_users.account_id
      AND au.user_id = auth.uid()
      AND au.role = 'owner'
      AND au.status = 'active'
    )
    AND user_id != auth.uid() -- Cannot remove yourself
  );

-- Users can remove themselves
CREATE POLICY "Users can remove themselves"
  ON account_users FOR DELETE
  USING (user_id = auth.uid() AND role != 'owner');
```

### New Table: `account_invitations`
Tracks pending invitations before users accept.

```sql
CREATE TABLE account_invitations (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL UNIQUE, -- UUID for invitation link
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(account_id, email, status) WHERE status = 'pending'
);

-- Indexes
CREATE INDEX idx_account_invitations_token ON account_invitations(token);
CREATE INDEX idx_account_invitations_email ON account_invitations(email);
CREATE INDEX idx_account_invitations_account_id ON account_invitations(account_id);

-- RLS Policies
ALTER TABLE account_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations to their email"
  ON account_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_invitations.account_id
      AND au.user_id = auth.uid()
      AND au.role = 'owner'
      AND au.status = 'active'
    )
  );

-- Owners can create invitations
CREATE POLICY "Owners can create invitations"
  ON account_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_users au
      WHERE au.account_id = account_invitations.account_id
      AND au.user_id = auth.uid()
      AND au.role = 'owner'
      AND au.status = 'active'
    )
  );
```

### Migration: Update All Tables to Use `account_id`

**Critical Change**: All existing tables need to change from `user_id` to `account_id`.

```sql
-- Migration: 022_add_multi_user_collaboration.sql

-- Step 1: Create new tables
-- (budget_accounts, account_users, account_invitations as above)

-- Step 2: Migrate existing data
-- For each existing user, create a budget_account and migrate their data

-- Create a budget_account for each existing user
INSERT INTO budget_accounts (owner_id, name, created_at, updated_at)
SELECT 
  id as owner_id,
  COALESCE((SELECT email FROM auth.users WHERE id = u.id), 'My Budget') as name,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u;

-- Add account_id column to all tables (nullable initially)
ALTER TABLE categories ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE accounts ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE credit_cards ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE pending_checks ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE merchant_mappings ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE imported_transactions ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE merchant_groups ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE merchant_category_rules ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE settings ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE goals ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE loans ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE income_settings ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE pre_tax_deductions ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE csv_import_templates ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE category_monthly_funding ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;
ALTER TABLE user_backups ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE;

-- Populate account_id from user_id
UPDATE categories c
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = c.user_id;

UPDATE accounts a
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = a.user_id;

UPDATE credit_cards cc
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = cc.user_id;

UPDATE transactions t
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = t.user_id;

UPDATE pending_checks pc
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = pc.user_id;

UPDATE merchant_mappings mm
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = mm.user_id;

UPDATE imported_transactions it
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = it.user_id;

UPDATE merchant_groups mg
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = mg.user_id;

UPDATE merchant_category_rules mcr
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = mcr.user_id;

UPDATE settings s
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = s.user_id;

UPDATE goals g
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = g.user_id;

UPDATE loans l
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = l.user_id;

UPDATE income_settings is
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = is.user_id;

UPDATE pre_tax_deductions ptd
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = ptd.user_id;

UPDATE csv_import_templates cit
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = cit.user_id;

UPDATE category_monthly_funding cmf
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = cmf.user_id;

UPDATE user_backups ub
SET account_id = ba.id
FROM budget_accounts ba
WHERE ba.owner_id = ub.user_id;

-- Make account_id NOT NULL and add indexes
ALTER TABLE categories ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE accounts ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE credit_cards ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE pending_checks ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE merchant_mappings ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE imported_transactions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE merchant_groups ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE merchant_category_rules ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE settings ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE goals ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE loans ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE income_settings ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE pre_tax_deductions ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE csv_import_templates ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE category_monthly_funding ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE user_backups ALTER COLUMN account_id SET NOT NULL;

-- Create indexes for account_id
CREATE INDEX idx_categories_account_id ON categories(account_id);
CREATE INDEX idx_accounts_account_id ON accounts(account_id);
CREATE INDEX idx_credit_cards_account_id ON credit_cards(account_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_pending_checks_account_id ON pending_checks(account_id);
CREATE INDEX idx_merchant_mappings_account_id ON merchant_mappings(account_id);
CREATE INDEX idx_imported_transactions_account_id ON imported_transactions(account_id);
CREATE INDEX idx_merchant_groups_account_id ON merchant_groups(account_id);
CREATE INDEX idx_merchant_category_rules_account_id ON merchant_category_rules(account_id);
CREATE INDEX idx_settings_account_id ON settings(account_id);
CREATE INDEX idx_goals_account_id ON goals(account_id);
CREATE INDEX idx_loans_account_id ON loans(account_id);
CREATE INDEX idx_income_settings_account_id ON income_settings(account_id);
CREATE INDEX idx_pre_tax_deductions_account_id ON pre_tax_deductions(account_id);
CREATE INDEX idx_csv_import_templates_account_id ON csv_import_templates(account_id);
CREATE INDEX idx_category_monthly_funding_account_id ON category_monthly_funding(account_id);
CREATE INDEX idx_user_backups_account_id ON user_backups(account_id);

-- Add account_users entries for existing owners
INSERT INTO account_users (account_id, user_id, role, status, accepted_at, created_at, updated_at)
SELECT id, owner_id, 'owner', 'active', NOW(), NOW(), NOW()
FROM budget_accounts;

-- Step 3: Update RLS Policies
-- Update all existing RLS policies to check account access instead of user_id

-- Helper function to check account access
CREATE OR REPLACE FUNCTION user_has_account_access(account_id_param BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_users au
    WHERE au.account_id = account_id_param
    AND au.user_id = auth.uid()
    AND au.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM budget_accounts ba
    WHERE ba.id = account_id_param
    AND ba.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check account write access
CREATE OR REPLACE FUNCTION user_has_account_write_access(account_id_param BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_users au
    WHERE au.account_id = account_id_param
    AND au.user_id = auth.uid()
    AND au.status = 'active'
    AND au.role IN ('owner', 'editor')
  ) OR EXISTS (
    SELECT 1 FROM budget_accounts ba
    WHERE ba.id = account_id_param
    AND ba.owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old RLS policies and create new ones
-- Example for categories (repeat for all tables):

DROP POLICY IF EXISTS "Users can view their own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON categories;

CREATE POLICY "Users can view categories in their accounts"
  ON categories FOR SELECT
  USING (user_has_account_access(account_id));

CREATE POLICY "Users can insert categories in their accounts"
  ON categories FOR INSERT
  WITH CHECK (user_has_account_write_access(account_id));

CREATE POLICY "Users can update categories in their accounts"
  ON categories FOR UPDATE
  USING (user_has_account_write_access(account_id));

CREATE POLICY "Users can delete categories in their accounts"
  ON categories FOR DELETE
  USING (user_has_account_write_access(account_id));

-- Repeat for all other tables...
```

**Note**: Keep `user_id` columns for audit trails and to track who created/modified records, but use `account_id` for access control.

---

## 🔐 Authentication & Authorization Changes

### Account Context Management

#### 1. Active Account Selection
- Store active `account_id` in:
  - **Server-side**: Session/cookie (preferred for security)
  - **Client-side**: localStorage (fallback, less secure)
- Default to user's primary account on login
- Allow switching accounts via UI

#### 2. Helper Functions

```typescript
// src/lib/account-context.ts

export async function getActiveAccountId(): Promise<number | null> {
  // Check session/cookie first
  // Fallback to user's primary account
  const { supabase, user } = await getAuthenticatedUser();
  
  // Get user's accounts (both owned and shared)
  const { data: accounts } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('role', { ascending: true }) // owners first
    .limit(1);
  
  // If no shared accounts, check if user owns any accounts
  if (!accounts || accounts.length === 0) {
    const { data: ownedAccounts } = await supabase
      .from('budget_accounts')
      .select('id')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .limit(1);
    
    return ownedAccounts?.[0]?.id || null;
  }
  
  return accounts[0].account_id;
}

export async function userHasOwnAccount(): Promise<boolean> {
  const { supabase, user } = await getAuthenticatedUser();
  
  const { count } = await supabase
    .from('budget_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .is('deleted_at', null);
  
  return (count || 0) > 0;
}

export async function getUserAccountCount(): Promise<number> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Count owned accounts
  const { count: ownedCount } = await supabase
    .from('budget_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .is('deleted_at', null);
  
  // Count shared accounts
  const { count: sharedCount } = await supabase
    .from('account_users')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'active');
  
  return (ownedCount || 0) + (sharedCount || 0);
}

export async function setActiveAccountId(accountId: number): Promise<void> {
  // Verify user has access to this account
  const { supabase, user } = await getAuthenticatedUser();
  
  const { data } = await supabase
    .from('account_users')
    .select('account_id')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();
  
  if (!data) {
    // Check if user is owner
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('owner_id', user.id)
      .single();
    
    if (!account) {
      throw new Error('Unauthorized: User does not have access to this account');
    }
  }
  
  // Store in cookie/session
  // Implementation depends on session management approach
}

export async function getUserAccounts(): Promise<AccountMembership[]> {
  const { supabase, user } = await getAuthenticatedUser();
  
  const { data } = await supabase
    .from('account_users')
    .select(`
      account_id,
      role,
      account:budget_accounts (
        id,
        name,
        owner_id
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');
  
  // Also include accounts where user is owner
  const { data: ownedAccounts } = await supabase
    .from('budget_accounts')
    .select('id, name, owner_id')
    .eq('owner_id', user.id);
  
  return [
    ...(data || []).map(a => ({
      accountId: a.account_id,
      role: a.role,
      accountName: a.account.name,
      isOwner: a.account.owner_id === user.id,
    })),
    ...(ownedAccounts || []).map(a => ({
      accountId: a.id,
      role: 'owner' as const,
      accountName: a.name,
      isOwner: true,
    })),
  ];
}
```

#### 3. Update Query Functions

All query functions need to filter by `account_id` instead of `user_id`:

```typescript
// Before:
export async function getAllCategories() {
  const { supabase } = await getAuthenticatedUser();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id); // ❌ Old way
}

// After:
export async function getAllCategories() {
  const { supabase } = await getAuthenticatedUser();
  const accountId = await getActiveAccountId();
  if (!accountId) throw new Error('No active account');
  
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('account_id', accountId); // ✅ New way
}
```

---

## 🎨 User Interface Components

### 1. Account Switcher Component
**Location**: Header/Navigation bar (always visible when logged in)

**Features**:
- Dropdown showing all accounts user belongs to
- Current account highlighted
- Account name + role badge (Owner/Editor/Viewer)
- "Switch Account" action
- "Manage Accounts" link to settings
- **"Create My Own Account"** option if user doesn't own any accounts
- Shows count of accounts user belongs to

**Design**:
```
[Current Account Name ▼]
├─ Smith Family Budget (Owner) ← Current
├─ John's Personal Budget (Editor)
├─ Business Account (Viewer)
├─ ─────────────────────
└─ ➕ Create My Own Account  ← Only shown if user has no owned accounts
```

**Logic**:
- Check if user owns any accounts
- If not, show "Create My Own Account" option at bottom of dropdown
- Clicking it opens account creation dialog/modal
- After creation, automatically switch to new account

### 2. Invite User Dialog
**Location**: Settings → Collaborators page

**Features**:
- Email input field
- Role selector (Editor/Viewer)
- Send invitation button
- List of pending invitations
- List of active collaborators
- Ability to resend/cancel invitations
- Ability to change permissions or remove collaborators

**UI Flow**:
1. Owner clicks "Invite User"
2. Enter email and select role
3. System sends invitation email
4. Invitation appears in "Pending" list
5. When user accepts, moves to "Active" list

### 3. Accept Invitation Page
**Location**: `/invite/[token]` (public route)

**Features**:
- Show account name and inviter name
- Show assigned role
- "Accept Invitation" button
- If user not logged in: prompt to sign up/login first
- If user already member: show message and redirect
- **Important**: Accepting invitation does NOT create a personal account for the user
- User becomes a member of the shared account only
- After acceptance, redirect to dashboard with shared account as active

### 4. Account Settings Page
**Location**: `/settings/account` (update existing)

**New Sections**:
- **Account Info**
  - Account name (editable by owner)
  - Owner information
  - Created date
  
- **Collaborators**
  - List of all members with roles
  - Invite new user button
  - Change permissions
  - Remove member (owner only)
  - Leave account (non-owners)
  
- **Danger Zone** (owner only)
  - Delete account (with confirmation)
  - Transfer ownership (future feature)

### 5. Leave Account Dialog
**Location**: Triggered from Account Settings

**Features**:
- Confirmation message
- Check if user has any other accounts (owned or shared)
- **If user has other accounts:**
  - Option: "Leave this account" (removes from account only, keeps user account)
- **If user has NO other accounts:**
  - Show warning: "This is your only account. Leaving will require you to create your own account or delete your user account."
  - Options:
    - "Create My Own Account" (creates account, then removes from shared account)
    - "Delete my user account" (removes user entirely - only allowed if no accounts exist)
- **Cannot delete user account if they have any accounts** (owned or shared)

---

## 📧 Email Templates

### Invitation Email
**Subject**: "You've been invited to collaborate on [Account Name]"

**Content**:
- Inviter's name
- Account name
- Assigned role (Editor/Viewer)
- Accept button (links to `/invite/[token]`)
- Expiration notice (30 days)

### Invitation Accepted Notification
**Subject**: "[User Name] accepted your invitation"

**Content**:
- User who accepted
- Account name
- Link to account settings

### Invitation Reminder (optional)
**Subject**: "Reminder: You have a pending invitation"

**Content**:
- Sent after 7 days if not accepted
- Same as invitation email

---

## 🔄 API Endpoints

### Account Management

#### `GET /api/accounts`
Get all accounts user belongs to.

**Response**:
```json
{
  "accounts": [
    {
      "id": 1,
      "name": "Smith Family Budget",
      "role": "owner",
      "isOwner": true,
      "memberCount": 2
    }
  ],
  "activeAccountId": 1
}
```

#### `POST /api/accounts/switch`
Switch active account.

**Request**:
```json
{
  "accountId": 1
}
```

#### `POST /api/accounts`
Create new account (for users creating their own).

**Request**:
```json
{
  "name": "My Personal Budget"
}
```

### Invitations

#### `POST /api/invitations`
Send invitation to join account.

**Request**:
```json
{
  "email": "spouse@example.com",
  "role": "editor"
}
```

**Response**:
```json
{
  "success": true,
  "invitation": {
    "id": 1,
    "email": "spouse@example.com",
    "role": "editor",
    "expiresAt": "2025-02-15T00:00:00Z"
  }
}
```

#### `GET /api/invitations`
Get pending invitations for current account.

**Response**:
```json
{
  "invitations": [
    {
      "id": 1,
      "email": "spouse@example.com",
      "role": "editor",
      "invitedBy": "John Doe",
      "expiresAt": "2025-02-15T00:00:00Z"
    }
  ]
}
```

#### `POST /api/invitations/[token]/accept`
Accept invitation.

**Behavior**:
- Creates `account_users` entry linking user to account
- Does NOT create a personal `budget_account` for the user
- User becomes member of shared account only
- Sets accepted account as active account

**Response**:
```json
{
  "success": true,
  "account": {
    "id": 1,
    "name": "Smith Family Budget"
  },
  "userHasOwnAccount": false
}
```

#### `DELETE /api/invitations/[id]`
Cancel pending invitation (owner only).

### Collaborators

#### `GET /api/accounts/[id]/members`
Get all members of an account.

**Response**:
```json
{
  "members": [
    {
      "userId": "uuid",
      "email": "john@example.com",
      "role": "owner",
      "joinedAt": "2025-01-01T00:00:00Z"
    },
    {
      "userId": "uuid",
      "email": "jane@example.com",
      "role": "editor",
      "joinedAt": "2025-01-15T00:00:00Z"
    }
  ]
}
```

#### `PATCH /api/accounts/[id]/members/[userId]`
Update member permissions.

**Request**:
```json
{
  "role": "viewer"
}
```

#### `DELETE /api/accounts/[id]/members/[userId]`
Remove member from account (owner only, cannot remove self).

#### `DELETE /api/accounts/[id]/leave`
Leave account (non-owners).

**Validation**:
- Check if user has any other accounts (owned or shared)
- If user has other accounts: allow leaving
- If user has NO other accounts: require account creation or account deletion
- Cannot delete user account if they have any accounts remaining

**Request**:
```json
{
  "createOwnAccount": false, // If true, creates account before leaving
  "deleteUserAccount": false // Only allowed if user has NO accounts
}
```

**Response**:
```json
{
  "success": true,
  "message": "Left account successfully",
  "createdAccount": false, // true if createOwnAccount was true
  "remainingAccounts": 0 // Count of accounts user still belongs to
}
```

**Error Response** (if trying to delete with accounts remaining):
```json
{
  "error": "Cannot delete user account while member of accounts",
  "remainingAccounts": 2
}
```

### User Account Management

#### `DELETE /api/user/delete-account`
Delete user account entirely.

**CRITICAL VALIDATION**:
- Check if user owns any accounts (`budget_accounts` where `owner_id = user.id`)
- Check if user is member of any accounts (`account_users` where `user_id = user.id` and `status = 'active'`)
- **Only allow deletion if both counts are 0**
- If user has accounts, return error with helpful message

**Request**: None (uses authenticated user)

**Success Response**:
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Response** (if user has accounts):
```json
{
  "error": "Cannot delete account while member of accounts",
  "ownedAccounts": 1,
  "sharedAccounts": 1,
  "message": "To delete your account, first leave all shared accounts and delete any accounts you own."
}
```

**Implementation Notes**:
- Update existing `/api/user/delete-account` endpoint
- Add account count checks before deletion
- Provide clear error messages
- UI should check account count and disable delete button if user has accounts

---

## ⚠️ Critical Considerations & Edge Cases

### 1. Data Migration
- **Risk**: Existing users have data tied to `user_id`
- **Solution**: Migration script creates `budget_account` for each user and populates `account_id`
- **Testing**: Test migration on staging with production data copy

### 2. RLS Policy Updates
- **Risk**: Breaking existing access control
- **Solution**: 
  - Create helper functions for access checks
  - Test all RLS policies thoroughly
  - Keep `user_id` for audit trails

### 3. Account Deletion
- **Risk**: What happens when owner deletes account?
- **Solution**: 
  - Soft delete account (set `deleted_at`)
  - Notify all members
  - Give members 30 days to export data
  - Hard delete after grace period

### 4. Owner Removal
- **Risk**: What if owner account is deleted?
- **Solution**: 
  - Prevent owner from removing themselves
  - If owner account deleted, transfer ownership to oldest editor
  - If no editors, account becomes orphaned (admin intervention needed)

### 5. Subscription/Feature Access
- **Risk**: Who pays for premium features?
- **Solution**: 
  - Premium tied to account, not user
  - Owner's subscription applies to account
  - If owner leaves, subscription transfers to new owner
  - If no owner, account downgrades to free

### 6. Backup & Restore
- **Risk**: Backups need to include account context and all collaborators
- **Solution**: 
  - **CRITICAL**: Change backups from user-based to account-based
  - Only account owners can create/restore backups
  - Backup must include:
    1. All account data (filtered by `account_id`, not `user_id`)
    2. Account metadata (`budget_accounts` record)
    3. All collaborators (`account_users` relationships)
    4. Pending invitations (`account_invitations`)
  - On restore: Restore entire account including all collaborators
  - Preserve user relationships and permissions
  - Update `user_backups` table to use `account_id` instead of `user_id`
  - Update RLS policies to check account ownership
  - Migration: Convert existing user backups to account backups (create account if needed)

### 7. CSV Import
- **Risk**: Imports need account context
- **Solution**: 
  - Imports automatically use active account
  - Templates are account-specific

### 8. Concurrent Edits
- **Risk**: Two users editing same data simultaneously
- **Solution**: 
  - Optimistic locking with `updated_at` timestamps
  - Show "This was modified by [User]" warnings
  - Refresh data before save

### 9. Notification System
- **Risk**: Users need to know about account activity
- **Solution**: 
  - Activity feed showing recent changes
  - Email notifications for important actions
  - In-app notifications

### 10. Account Limits
- **Risk**: Spam/abuse of invitation system
- **Solution**: 
  - Limit invitations per account (e.g., 10 pending)
  - Rate limit invitation emails
  - Require email verification

### 11. User Account Deletion
- **Risk**: User wants to delete account but is member of accounts
- **Solution**: 
  - **CRITICAL**: User can ONLY delete their account if they have NO accounts (owned or shared)
  - Before allowing deletion, check:
    1. Count of accounts user owns (`budget_accounts` where `owner_id = user.id`)
    2. Count of accounts user is member of (`account_users` where `user_id = user.id` and `status = 'active'`)
  - If count > 0: Show error "Cannot delete account. You must leave all accounts first."
  - If count = 0: Allow deletion with clear warning
  - Update `/api/user/delete-account` endpoint to enforce this check
  - UI should disable delete button if user has any accounts
  - Show helpful message: "To delete your account, first leave all shared accounts and delete any accounts you own."

### 12. Email Changes
- **Risk**: User changes email, pending invitations become invalid
- **Solution**: 
  - Link invitations to user account (after acceptance)
  - Or use user_id instead of email for accepted invitations
  - Keep email for pending invitations

### 13. Backup & Restore System Changes
- **Risk**: Current backup system is user-based, needs to be account-based
- **Solution**: 
  - **CRITICAL**: Change backups from user-based to account-based
  - Only account owners can create/restore backups
  - Backup must include entire account structure:
    1. Account metadata (`budget_accounts` record)
    2. All collaborators (`account_users` relationships with roles)
    3. Pending invitations (`account_invitations`)
    4. All account data (filtered by `account_id`, not `user_id`)
  - On restore: Restore entire account including all collaborators
  - Preserve user relationships and permissions
  - Update `user_backups` table schema
  - Update RLS policies to check account ownership
  - Migration: Convert existing user backups to account backups

**Detailed Backup Changes**:

#### Database Schema Updates
```sql
-- Update user_backups table to be account-based
ALTER TABLE user_backups 
  ADD COLUMN account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE,
  ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Make account_id required (after migration)
ALTER TABLE user_backups ALTER COLUMN account_id SET NOT NULL;

-- Update indexes
CREATE INDEX idx_user_backups_account_id ON user_backups(account_id);

-- Update RLS policies
DROP POLICY "Users can view own backups" ON user_backups;
DROP POLICY "Users can create own backups" ON user_backups;
DROP POLICY "Users can delete own backups" ON user_backups;

-- Only account owners can view backups
CREATE POLICY "Account owners can view backups"
  ON user_backups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_backups.account_id
      AND ba.owner_id = auth.uid()
    )
  );

-- Only account owners can create backups
CREATE POLICY "Account owners can create backups"
  ON user_backups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_backups.account_id
      AND ba.owner_id = auth.uid()
    )
  );

-- Only account owners can delete backups
CREATE POLICY "Account owners can delete backups"
  ON user_backups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = user_backups.account_id
      AND ba.owner_id = auth.uid()
    )
  );
```

#### Backup Format Changes
```typescript
export interface AccountBackupData {
  version: string; // e.g., "2.0" (new version for account-based backups)
  created_at: string;
  created_by: string; // User ID of account owner who created backup
  
  // Account structure
  account: {
    id: number;
    name: string;
    owner_id: string;
    created_at: string;
    updated_at: string;
  };
  
  // Collaborators
  account_users: Array<{
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'active' | 'invited' | 'removed';
    invited_by: string | null;
    invited_at: string;
    accepted_at: string | null;
  }>;
  
  // Pending invitations
  account_invitations: Array<{
    email: string;
    role: 'editor' | 'viewer';
    token: string;
    invited_by: string;
    expires_at: string;
  }>;
  
  // Account data (all filtered by account_id)
  accounts: any[];
  categories: any[];
  credit_cards: any[];
  loans: any[];
  transactions: any[];
  transaction_splits: any[];
  imported_transactions: any[];
  imported_transaction_links: any[];
  merchant_groups: any[];
  merchant_mappings: any[];
  merchant_category_rules: any[];
  pending_checks: any[];
  income_settings: any[];
  pre_tax_deductions: any[];
  settings: any[];
  goals: any[];
  csv_import_templates: any[];
  category_monthly_funding: any[];
  user_feature_flags: any[];
}
```

#### Backup Export Function Changes
```typescript
export async function exportAccountData(accountId: number): Promise<AccountBackupData> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // Verify user is account owner
  const { data: account } = await supabase
    .from('budget_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('owner_id', user.id)
    .single();
  
  if (!account) {
    throw new Error('Unauthorized: Only account owners can create backups');
  }
  
  // Fetch account structure
  const { data: accountUsers } = await supabase
    .from('account_users')
    .select('*')
    .eq('account_id', accountId);
  
  const { data: invitations } = await supabase
    .from('account_invitations')
    .select('*')
    .eq('account_id', accountId)
    .is('accepted_at', null); // Only pending invitations
  
  // Fetch all account data (filtered by account_id)
  const [
    { data: accounts },
    { data: categories },
    { data: credit_cards },
    // ... all other tables
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('account_id', accountId),
    supabase.from('categories').select('*').eq('account_id', accountId),
    supabase.from('credit_cards').select('*').eq('account_id', accountId),
    // ... all other tables
  ]);
  
  return {
    version: '2.0',
    created_at: new Date().toISOString(),
    created_by: user.id,
    account: account,
    account_users: accountUsers || [],
    account_invitations: invitations || [],
    accounts: accounts || [],
    categories: categories || [],
    // ... all other data
  };
}
```

#### Backup Restore Function Changes
```typescript
export async function importAccountData(
  backupData: AccountBackupData,
  targetAccountId?: number
): Promise<void> {
  const { supabase, user } = await getAuthenticatedUser();
  
  // If restoring to existing account, verify ownership
  if (targetAccountId) {
    const { data: account } = await supabase
      .from('budget_accounts')
      .select('*')
      .eq('id', targetAccountId)
      .eq('owner_id', user.id)
      .single();
    
    if (!account) {
      throw new Error('Unauthorized: Only account owners can restore backups');
    }
  }
  
  // Step 1: Delete existing account data (if restoring to existing account)
  if (targetAccountId) {
    // Delete all data for this account
    await deleteAccountData(targetAccountId);
  }
  
  // Step 2: Restore account structure
  // If targetAccountId provided, update existing account
  // Otherwise, create new account (current user becomes owner)
  let restoredAccountId: number;
  
  if (targetAccountId) {
    // Update existing account
    await supabase
      .from('budget_accounts')
      .update({
        name: backupData.account.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetAccountId);
    restoredAccountId = targetAccountId;
  } else {
    // Create new account with current user as owner
    const { data: newAccount } = await supabase
      .from('budget_accounts')
      .insert({
        name: backupData.account.name,
        owner_id: user.id,
      })
      .select('id')
      .single();
    restoredAccountId = newAccount.id;
  }
  
  // Step 3: Restore collaborators
  // Map old user_ids to current user_ids (if users exist)
  // For users that don't exist, create pending invitations
  for (const accountUser of backupData.account_users) {
    if (accountUser.status === 'active') {
      // Check if user exists (by email or user_id)
      // If exists, add to account_users
      // If not, create invitation
      await restoreAccountUser(restoredAccountId, accountUser);
    }
  }
  
  // Step 4: Restore pending invitations
  for (const invitation of backupData.account_invitations) {
    // Create new invitation token
    await supabase.from('account_invitations').insert({
      account_id: restoredAccountId,
      email: invitation.email,
      role: invitation.role,
      token: generateInvitationToken(),
      invited_by: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  // Step 5: Restore all account data (with account_id remapping)
  await restoreAccountData(backupData, restoredAccountId);
}
```

#### Migration Strategy for Existing Backups
```sql
-- Migration script to convert user backups to account backups
-- For each existing backup:
-- 1. Find user's account (or create one)
-- 2. Update backup to include account structure
-- 3. Update user_backups.account_id

DO $$
DECLARE
  backup_record RECORD;
  user_account_id BIGINT;
BEGIN
  FOR backup_record IN 
    SELECT id, user_id, backup_data 
    FROM user_backups 
    WHERE account_id IS NULL
  LOOP
    -- Find or create account for this user
    SELECT id INTO user_account_id
    FROM budget_accounts
    WHERE owner_id = backup_record.user_id
    LIMIT 1;
    
    -- If no account exists, create one
    IF user_account_id IS NULL THEN
      INSERT INTO budget_accounts (owner_id, name)
      VALUES (backup_record.user_id, 'My Budget')
      RETURNING id INTO user_account_id;
      
      -- Add user as owner
      INSERT INTO account_users (account_id, user_id, role, status, accepted_at)
      VALUES (user_account_id, backup_record.user_id, 'owner', 'active', NOW());
    END IF;
    
    -- Update backup with account_id
    UPDATE user_backups
    SET account_id = user_account_id,
        created_by = backup_record.user_id
    WHERE id = backup_record.id;
    
    -- Update backup_data JSON to include account structure
    -- (This would require JSON manipulation)
  END LOOP;
END $$;
```

---

## 🧪 Testing Strategy

### Unit Tests
- Account creation and ownership
- Permission checks (read/write)
- Invitation flow
- Member removal
- Account switching

### Integration Tests
- Full invitation → acceptance flow
- Multi-user collaboration scenarios
- Permission enforcement
- RLS policy verification
- **Backup & Restore**:
  - Account owner creates backup
  - Backup includes all collaborators and account structure
  - Non-owner cannot create backup
  - Restore restores entire account with collaborators
  - Restore preserves user relationships and permissions

### E2E Tests
- User A invites User B
- User B accepts and collaborates (does NOT get own account)
- User B sees "Create My Own Account" in account switcher
- User B creates own account via switcher
- User A changes User B's permissions
- User B leaves account (with and without other accounts)
- User tries to delete account while member of accounts (should fail)
- User deletes account after leaving all accounts (should succeed)
- Account deletion flow

### Migration Tests
- Test migration script on production data copy
- Verify all data migrated correctly
- Verify RLS policies work after migration
- Rollback plan testing

---

## 📋 Implementation Checklist

### Phase 1: Database & Migration
- [ ] Create `budget_accounts` table
- [ ] Create `account_users` table
- [ ] Create `account_invitations` table
- [ ] Add `account_id` columns to all tables
- [ ] Create migration script
- [ ] Create helper functions for access checks
- [ ] Update all RLS policies
- [ ] Test migration on staging

### Phase 2: Backend API
- [ ] Create account management endpoints
- [ ] Create invitation endpoints
- [ ] Create collaborator management endpoints
- [ ] Update all query functions to use `account_id`
- [ ] Add account context middleware
- [ ] Update authentication helpers
- [ ] **Accept invitation endpoint**: Ensure it does NOT create personal account for user
- [ ] **User account deletion endpoint**: Add validation to check account counts (owned + shared)
- [ ] **Leave account endpoint**: Add validation for account deletion requirements
- [ ] Helper functions: `userHasOwnAccount()`, `getUserAccountCount()`
- [ ] **Backup system updates**:
  - [ ] Update `user_backups` table schema (add `account_id`, `created_by`)
  - [ ] Update backup export function to export entire account (account structure + collaborators + data)
  - [ ] Update backup restore function to restore entire account
  - [ ] Update backup API endpoints to check account ownership
  - [ ] Update RLS policies for backups
  - [ ] Migration script to convert existing user backups to account backups

### Phase 3: Frontend Components
- [ ] Account switcher component
  - [ ] Show "Create My Own Account" option if user has no owned accounts
  - [ ] Handle account creation from switcher
- [ ] Invite user dialog
- [ ] Accept invitation page
  - [ ] Ensure no automatic account creation on acceptance
- [ ] Account settings page updates
- [ ] Leave account dialog
  - [ ] Check account count before showing options
  - [ ] Show appropriate options based on account count
  - [ ] Prevent account deletion if user has accounts
- [ ] User account deletion UI
  - [ ] Check account count and disable delete button if user has accounts
  - [ ] Show helpful error message if deletion attempted with accounts
- [ ] Update all pages to use account context

### Phase 4: Email & Notifications
- [ ] Invitation email template
- [ ] Email sending service
- [ ] Notification system (optional)

### Phase 5: Testing & Polish
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Migration testing
- [ ] Performance testing
- [ ] Security audit

### Phase 6: Documentation
- [ ] User guide for collaboration
- [ ] API documentation updates
- [ ] Migration guide for existing users

---

## 🚀 Rollout Strategy

### Beta Testing
1. Enable feature flag for beta users
2. Test with real couples/families
3. Gather feedback
4. Iterate on UX

### Gradual Rollout
1. Enable for 10% of users
2. Monitor for errors/issues
3. Gradually increase to 100%
4. Monitor performance metrics

### Migration Strategy
1. Run migration during low-traffic period
2. Have rollback plan ready
3. Notify users of new feature
4. Provide migration guide

---

## 🔮 Future Enhancements

### Phase 2 Features (Post-Launch)
- **Activity Feed**: Show recent changes by collaborator
- **Comments/Notes**: Add notes to transactions/categories
- **Transfer Ownership**: Allow owner to transfer account
- **Account Templates**: Create account from template
- **Bulk Invitations**: Invite multiple users at once
- **Custom Roles**: Create custom permission sets
- **Account Groups**: Organize accounts into groups
- **Shared Categories**: Share specific categories between accounts

### Advanced Features
- **Account Merging**: Merge two accounts
- **Time-based Permissions**: Grant temporary access
- **Audit Log**: Track all changes with user attribution
- **Account Archiving**: Archive inactive accounts
- **Multi-currency Support**: Different accounts in different currencies

---

## 📝 Notes

### Design Decisions

1. **Why `account_id` instead of keeping `user_id`?**
   - Cleaner separation of concerns
   - Easier to manage permissions
   - Better for future features (account-level settings, etc.)

2. **Why keep `user_id` columns?**
   - Audit trails (who created/modified)
   - Analytics (user behavior)
   - Future features (user-specific preferences)

3. **Why soft delete for accounts?**
   - Allows recovery if accidental deletion
   - Gives members time to export data
   - Better user experience

4. **Why invitation tokens instead of direct links?**
   - Security (expiring tokens)
   - Can revoke invitations
   - Better tracking

5. **Why account switcher instead of separate apps?**
   - Better UX (no need to log out/in)
   - Shared authentication
   - Easier to manage multiple accounts

---

## 🎯 Success Metrics

- Number of accounts with multiple members
- Average collaborators per account
- Invitation acceptance rate
- User engagement (do collaborators actually use the feature?)
- Support tickets related to collaboration
- Performance impact (query times, page load times)

---

## ⚡ Performance Considerations

### Database Indexes
- All `account_id` columns need indexes
- `account_users` needs composite indexes
- Query optimization for account context

### Caching
- Cache active account ID
- Cache user's account list
- Cache account member list

### Query Optimization
- Batch queries where possible
- Use joins instead of multiple queries
- Consider materialized views for account summaries

---

## 🔒 Security Considerations

### Access Control
- All RLS policies must be tested
- API endpoints must verify account access
- Prevent privilege escalation

### Invitation Security
- Tokens must be cryptographically secure
- Expire tokens after 30 days
- Rate limit invitation emails
- Verify email ownership

### Data Isolation
- Ensure users can only access their accounts
- Prevent cross-account data leakage
- Audit all access patterns

---

## 📚 References

- Supabase RLS Documentation
- Multi-tenancy patterns
- Collaboration feature examples (Notion, Google Workspace)
- Invitation system best practices

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-15  
**Author**: AI Assistant  
**Status**: Planning Phase


