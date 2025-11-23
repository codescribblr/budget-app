# Help Center - Comprehensive Implementation Plan

**Branch:** `feature/help-center`  
**Date:** November 23, 2025  
**Status:** Planning Phase

---

## 🎯 Overview

Create a comprehensive Help Center that serves as the primary learning and support resource for users. The Help Center will include documentation, tutorials, FAQs, and interactive wizards to guide users through setup and feature adoption.

### Goals

1. **Reduce learning curve** for new users
2. **Provide just-in-time help** when users need it
3. **Guide users through complex setups** with interactive wizards
4. **Answer common questions** before users get stuck
5. **Enable self-service support** to reduce support burden
6. **Progressive disclosure** - show help relevant to enabled features

---

## 📐 Architecture

### Navigation Structure

**Sidebar Section:** "Help & Support" (new section in app sidebar)

**Internal Navigation:** Similar to Settings page with sidebar navigation

```
Help Center
├── Getting Started
│   ├── Welcome & Overview
│   ├── Quick Start Guide
│   ├── Core Concepts
│   └── Your First Budget
├── Features
│   ├── Dashboard
│   ├── Accounts & Credit Cards
│   ├── Budget Categories (Envelopes)
│   ├── Transactions
│   ├── Money Movement
│   ├── CSV Import
│   ├── Merchants & Auto-Categorization
│   ├── Goals
│   ├── Loans & Debt Tracking
│   ├── Pending Checks
│   ├── Income Settings
│   ├── Reports & Analytics
│   └── Advanced Features (feature-flag dependent)
│       ├── Category Types
│       ├── Priority System
│       ├── Smart Allocation
│       └── Income Buffer
├── Tutorials
│   ├── Setting Up Your First Budget
│   ├── Importing Transactions
│   ├── Managing Irregular Income
│   ├── Tracking Debt Payoff
│   ├── Setting Up Auto-Categorization
│   ├── Using Smart Allocation
│   └── Building an Emergency Fund
├── Wizards (Interactive)
│   ├── Initial Budget Setup Wizard
│   ├── Income Setup Wizard
│   ├── Category Types Setup Wizard
│   ├── Smart Allocation Setup Wizard
│   └── Income Buffer Setup Wizard
├── FAQ
│   ├── General Questions
│   ├── Envelope Budgeting Basics
│   ├── Transactions & Categories
│   ├── Money Movement
│   ├── Import & Export
│   ├── Advanced Features
│   └── Troubleshooting
├── Video Tutorials (Future)
│   └── Placeholder for future video content
└── Support
    ├── Contact Support
    ├── Report a Bug
    ├── Feature Requests
    └── Community Forum (Future)
```

---

## 📄 Content Inventory

### 1. Getting Started Section

#### 1.1 Welcome & Overview
**Purpose:** First page users see in Help Center  
**Content:**
- What is envelope budgeting?
- How this app helps you budget
- Key features overview
- Navigation guide
- Next steps (link to Quick Start)

#### 1.2 Quick Start Guide
**Purpose:** Get users up and running in 5-10 minutes  
**Content:**
- Step 1: Add your accounts
- Step 2: Create budget categories
- Step 3: Allocate your current balance
- Step 4: Start tracking transactions
- Step 5: Review your dashboard
- What to do next

#### 1.3 Core Concepts
**Purpose:** Explain fundamental budgeting concepts  
**Content:**
- What is envelope budgeting?
- Categories vs Accounts
- Current Balance vs Available to Save
- How money flows through the system
- The monthly budget cycle
- Understanding the dashboard summary

#### 1.4 Your First Budget
**Purpose:** Detailed walkthrough of creating a complete budget  
**Content:**
- Identifying your income
- Listing your expenses
- Creating categories for each expense type
- Setting monthly amounts
- Allocating your first paycheck
- Adjusting as you go

---

### 2. Features Section

#### 2.1 Dashboard
**Content:**
- Understanding the summary cards
- Total Monies explained
- Available to Save calculation
- Budget Categories (Envelopes) card
- Accounts card
- Credit Cards card
- Pending Checks card
- Loans card
- Goals card
- Income Buffer card (if enabled)

#### 2.2 Accounts & Credit Cards
**Content:**
- Adding accounts
- Include/exclude from totals
- Updating balances
- Adding credit cards
- Credit limit vs available credit
- How credit card balances are calculated
- When to include/exclude accounts

#### 2.3 Budget Categories (Envelopes)
**Content:**
- Creating categories
- Setting monthly amounts
- Understanding current balance
- Funded this month (if enabled)
- Category types (if enabled)
- Priority system (if enabled)
- Sorting and organizing categories
- Editing and deleting categories
- System categories (Transfer, Income Buffer)

#### 2.4 Transactions
**Content:**
- Adding transactions
- Editing transactions
- Deleting transactions
- Transaction splits
- How transactions affect category balances
- Filtering and searching
- Transaction history

#### 2.5 Money Movement
**Content:**
- Allocate to Envelopes tab
  - Manual allocation
  - Use monthly amounts
  - Distribute proportionally
  - Smart Allocation (if enabled)
- Transfer Between Envelopes tab
  - Moving money between categories
  - When to transfer
- Add to Buffer tab (if enabled)
  - Adding income to buffer
  - Withdrawing from buffer

#### 2.6 CSV Import
**Content:**
- Preparing your CSV file
- Supported formats
- Mapping columns
- Handling duplicates
- Auto-categorization during import
- Reviewing imported transactions
- Creating import templates
- Troubleshooting import issues

#### 2.7 Merchants & Auto-Categorization
**Content:**
- How merchant grouping works
- Creating merchant groups
- Setting up category rules
- Auto-categorization logic
- Editing merchant mappings
- Best practices for merchant rules

#### 2.8 Goals
**Content:**
- Creating financial goals
- Setting target amounts and dates
- Contributing to goals
- Tracking progress
- Completing goals
- Deleting goals

#### 2.9 Loans & Debt Tracking
**Content:**
- Adding loans
- Interest rates and minimum payments
- Payment due dates
- Include in net worth setting
- Tracking payoff progress
- Updating loan balances

#### 2.10 Pending Checks
**Content:**
- What are pending checks?
- Adding pending checks
- How they affect Available to Save
- Clearing pending checks
- When to use pending checks

#### 2.11 Income Settings
**Content:**
- Setting up income sources
- Paycheck frequency
- Pre-tax deductions
- Net vs gross income
- Multiple income sources
- Variable income tracking

#### 2.12 Reports & Analytics
**Content:**
- Overview report
  - Spending by category
  - Income vs expenses
  - Monthly trends
- Trends report
  - Category spending over time
  - Income trends
  - Savings rate
- Exporting data
- Date range selection

#### 2.13 Advanced Features
**Content (feature-flag dependent):**

**Category Types:**
- Monthly Expense type
- Accumulation type
- Target Balance type
- When to use each type
- Progress indicators
- Funding calculations

**Priority System:**
- Setting priorities (1-10)
- How priorities affect allocation
- Best practices for prioritization

**Smart Allocation:**
- How the algorithm works
- Calculating suggested allocations
- Editing suggestions
- Applying allocations
- Understanding the logic

**Income Buffer:**
- What is an income buffer?
- When to use it
- Adding money to buffer
- Monthly funding from buffer
- Months of runway calculation
- Best practices for irregular income

---

### 3. Tutorials Section

#### 3.1 Setting Up Your First Budget
**Format:** Step-by-step tutorial with screenshots
**Content:**
1. Understanding your financial situation
2. Gathering your financial information
3. Adding all accounts
4. Creating essential categories
5. Allocating your current balance
6. Setting up recurring transactions
7. Planning for the month ahead
8. Tips for success

**Estimated Time:** 30-45 minutes

#### 3.2 Importing Transactions
**Format:** Step-by-step tutorial with screenshots
**Content:**
1. Exporting from your bank
2. Preparing the CSV file
3. Starting the import process
4. Mapping columns correctly
5. Reviewing and categorizing
6. Handling duplicates
7. Completing the import
8. Verifying balances

**Estimated Time:** 15-20 minutes

#### 3.3 Managing Irregular Income
**Format:** Step-by-step tutorial with screenshots
**Content:**
1. Understanding the challenge
2. Enabling Category Types feature
3. Setting up category priorities
4. Enabling Smart Allocation
5. Setting up Income Buffer
6. Your first large payment
7. Monthly funding routine
8. Adjusting as needed

**Estimated Time:** 20-30 minutes

#### 3.4 Tracking Debt Payoff
**Format:** Step-by-step tutorial with screenshots
**Content:**
1. Adding all debts as loans
2. Setting up payment categories
3. Tracking interest and minimum payments
4. Creating a payoff strategy
5. Using goals for extra payments
6. Monitoring progress
7. Celebrating milestones

**Estimated Time:** 15-20 minutes

#### 3.5 Setting Up Auto-Categorization
**Format:** Step-by-step tutorial with screenshots
**Content:**
1. Understanding merchant groups
2. Reviewing uncategorized transactions
3. Creating merchant groups
4. Setting up category rules
5. Testing auto-categorization
6. Refining rules over time
7. Best practices

**Estimated Time:** 20-25 minutes

#### 3.6 Using Smart Allocation
**Format:** Step-by-step tutorial with screenshots
**Content:**
1. Prerequisites (Category Types, Priorities)
2. Setting up category types
3. Assigning priorities
4. Setting targets
5. Running Smart Allocation
6. Understanding suggestions
7. Editing and applying
8. Monthly workflow

**Estimated Time:** 25-30 minutes

#### 3.7 Building an Emergency Fund
**Format:** Step-by-step tutorial with screenshots
**Content:**
1. Determining your target amount
2. Creating an emergency fund category
3. Using Target Balance type (if enabled)
4. Setting up automatic contributions
5. Tracking progress
6. When to use it
7. Replenishing after use

**Estimated Time:** 10-15 minutes

---

### 4. Wizards Section (Interactive)

#### 4.1 Initial Budget Setup Wizard
**Trigger:** Auto-run for new users on first login
**Can be re-run:** Yes, from Help Center
**Steps:**

**Step 1: Welcome**
- Brief introduction
- What we'll set up
- Estimated time: 10-15 minutes
- Option to skip and do later

**Step 2: Income Type**
- Question: "How do you receive income?"
  - Regular salary (same amount each paycheck)
  - Variable income (different amounts)
  - Multiple sources
  - Other
- Based on answer, suggest features to enable

**Step 3: Add Accounts**
- Add at least one account
- Enter current balance
- Option to add more
- Explanation of include/exclude from totals

**Step 4: Add Credit Cards (Optional)**
- Skip or add credit cards
- Enter credit limit and available credit
- Explanation of how balances work

**Step 5: Create Essential Categories**
- Suggested categories based on income type:
  - Regular income: Standard monthly bills
  - Variable income: Prioritized essentials
- Quick-add common categories
- Option to customize

**Step 6: Set Monthly Amounts**
- For each category, enter monthly amount
- Explanation of what this means
- Can be adjusted later

**Step 7: Allocate Current Balance**
- Show Available to Save
- Suggest allocation to categories
- Allow manual adjustment
- Explanation of what happens next

**Step 8: Next Steps**
- Summary of what was set up
- Suggested next actions:
  - Add a transaction
  - Import transactions
  - Set up income settings
  - Explore advanced features
- Link to relevant help articles

#### 4.2 Income Setup Wizard
**Trigger:**
- Auto-run when user navigates to Income page for first time
- Can be triggered from Help Center
- Can be triggered from Income page

**Can be re-run:** Yes
**Steps:**

**Step 1: Income Type**
- How often do you get paid?
  - Weekly
  - Bi-weekly (every 2 weeks)
  - Semi-monthly (twice a month)
  - Monthly
  - Variable/Irregular
- Do you have multiple income sources? (Yes/No)

**Step 2: Primary Income Source**
- Name (e.g., "Main Job", "Freelance Work")
- Gross amount (before taxes)
- Net amount (take-home pay)
- Pay frequency (from Step 1)

**Step 3: Pre-Tax Deductions**
- Add deductions (401k, health insurance, etc.)
- For each deduction:
  - Name
  - Amount per paycheck
  - Is it a percentage? (Yes/No)
- Show calculation: Gross - Deductions = Net

**Step 4: Additional Income Sources (if applicable)**
- Repeat Step 2 for each additional source
- Mark which is primary

**Step 5: Variable Income Settings (if applicable)**
- Suggest enabling Income Buffer feature
- Explain how it helps
- Option to enable now or later

**Step 6: Summary & Next Steps**
- Review all income sources
- Total monthly income estimate
- Suggested next actions:
  - Set up categories based on income
  - Enable Smart Allocation (if variable income)
  - Set up automatic allocations

#### 4.3 Category Types Setup Wizard
**Trigger:**
- When user enables Category Types feature
- Can be triggered from Help Center

**Can be re-run:** Yes
**Steps:**

**Step 1: Introduction**
- What are category types?
- Benefits of using types
- Three types explained:
  - Monthly Expense
  - Accumulation
  - Target Balance

**Step 2: Review Existing Categories**
- Show all current categories
- For each category, suggest a type based on name/pattern
- Allow user to accept or change

**Step 3: Set Targets**
- For Accumulation categories:
  - Annual target amount
  - Explanation of monthly calculation
- For Target Balance categories:
  - Target balance to maintain
  - Explanation of funding logic

**Step 4: Summary**
- Show categorization results
- Explain what happens next
- Link to Priority System (next logical step)

#### 4.4 Smart Allocation Setup Wizard
**Trigger:**
- When user enables Smart Allocation feature
- Can be triggered from Help Center
- Can be triggered from Money Movement page

**Can be re-run:** Yes
**Steps:**

**Step 1: Prerequisites Check**
- Verify Category Types is enabled
- If not, offer to enable and run that wizard first

**Step 2: Introduction**
- What is Smart Allocation?
- How it helps
- How the algorithm works

**Step 3: Set Priorities**
- Show all categories
- For each category:
  - Current priority (default: 5)
  - Suggested priority based on type
  - Slider to adjust (1-10)
- Explanation of priority levels:
  - 1-3: Essential (rent, utilities, food)
  - 4-6: Important (insurance, savings)
  - 7-10: Nice to have (entertainment, hobbies)

**Step 4: Review Targets**
- Show categories with targets
- Verify targets are correct
- Option to adjust

**Step 5: Test Run**
- Enter a sample amount to allocate
- Show Smart Allocation suggestions
- Explain the logic
- Don't actually apply (just preview)

**Step 6: Summary & Next Steps**
- Priorities are set
- Ready to use Smart Allocation
- How to access it (Money Movement page)
- Link to tutorial

#### 4.5 Income Buffer Setup Wizard
**Trigger:**
- When user enables Income Buffer feature
- Can be triggered from Help Center
- Can be triggered from Income Buffer page

**Can be re-run:** Yes
**Steps:**

**Step 1: Introduction**
- What is an income buffer?
- Who should use it?
- How it works

**Step 2: Calculate Buffer Target**
- Question: How many months of expenses do you want to buffer?
  - 1 month (minimum)
  - 2 months (recommended)
  - 3+ months (ideal)
- Calculate total monthly expenses
- Show target buffer amount

**Step 3: Initial Funding (Optional)**
- Do you have money to add to buffer now?
- If yes, enter amount
- If no, explain how to build it over time

**Step 4: Monthly Funding Setup**
- Explain monthly funding process
- Set up reminder for 1st of month
- Option to enable auto-fund from buffer

**Step 5: Summary & Next Steps**
- Buffer category created
- Initial funding applied (if any)
- How to add more to buffer
- How to fund monthly expenses
- Link to Income Buffer page

---

### 5. FAQ Section

#### 5.1 General Questions

**Q: What is envelope budgeting?**
A: Detailed explanation with examples

**Q: Is my data secure?**
A: Security measures, encryption, privacy policy

**Q: Can I use this on mobile?**
A: Responsive design, mobile browser support

**Q: How do I export my data?**
A: Backup feature, CSV export options

**Q: Can I share my budget with someone?**
A: Current limitations, future plans

**Q: How much does this cost?**
A: Pricing information (if applicable)

#### 5.2 Envelope Budgeting Basics

**Q: What's the difference between a category and an account?**
A: Explanation with examples

**Q: What does "Available to Save" mean?**
A: Calculation breakdown, what it represents

**Q: Why is my Available to Save negative?**
A: Common causes, how to fix

**Q: Should I create a category for every expense?**
A: Best practices, grouping strategies

**Q: How often should I allocate money to envelopes?**
A: Depends on pay frequency, recommendations

**Q: What happens if I overspend a category?**
A: Negative balances, how to handle

#### 5.3 Transactions & Categories

**Q: How do I split a transaction across multiple categories?**
A: Step-by-step instructions

**Q: Can I edit a transaction after I've added it?**
A: Yes, how to do it, what happens to balances

**Q: What's the difference between deleting and editing?**
A: Explanation of each action

**Q: How do I handle returns/refunds?**
A: Best practices, positive transactions

**Q: Can I categorize a transaction as "Transfer"?**
A: When to use Transfer category, what it means

#### 5.4 Money Movement

**Q: What's the difference between "Allocate" and "Transfer"?**
A: Allocate = income to envelopes, Transfer = envelope to envelope

**Q: When should I use "Use Monthly Amounts"?**
A: Best for regular paychecks, explanation

**Q: What does "Distribute Proportionally" do?**
A: Calculation explanation, when to use

**Q: How does Smart Allocation decide where to put money?**
A: Algorithm explanation, priority system

**Q: Can I allocate more than I have available?**
A: Yes, going negative is allowed, implications

#### 5.5 Import & Export

**Q: What CSV format do I need?**
A: Required columns, optional columns, examples

**Q: Why aren't my transactions importing?**
A: Common issues, troubleshooting steps

**Q: How do I avoid duplicate transactions?**
A: Duplicate detection, manual exclusion

**Q: Can I import from [specific bank]?**
A: General guidance, bank-specific tips

**Q: How do I create an import template?**
A: Step-by-step instructions, benefits

#### 5.6 Advanced Features

**Q: What's the difference between category types?**
A: Monthly Expense vs Accumulation vs Target Balance

**Q: How do I know what priority to assign?**
A: Guidelines, examples, best practices

**Q: When should I use the Income Buffer?**
A: Irregular income scenarios, benefits

**Q: How is "Funded This Month" different from "Current Balance"?**
A: Explanation, why it matters

**Q: Can I disable a feature after enabling it?**
A: Yes, data loss warnings, what happens

#### 5.7 Troubleshooting

**Q: My balances don't match my bank. What do I do?**
A: Reconciliation process, common causes

**Q: I accidentally deleted a category. Can I get it back?**
A: No undo, prevention tips, how to recreate

**Q: The app is slow. How can I speed it up?**
A: Performance tips, browser recommendations

**Q: I'm getting an error when I try to [action]. Help!**
A: Common errors, solutions, how to report bugs

**Q: How do I reset my budget and start over?**
A: Clear data feature, backup first, confirmation

---

### 6. Video Tutorials Section (Future)

**Placeholder content:**
- "Video tutorials coming soon!"
- Suggested topics for videos
- Link to YouTube channel (when available)
- Request form for specific video topics

---

### 7. Support Section

#### 7.1 Contact Support
**Content:**
- Support email address
- Expected response time
- What to include in support request
- Contact form (optional)

#### 7.2 Report a Bug
**Content:**
- Bug report form
- Required information:
  - What were you trying to do?
  - What happened instead?
  - Steps to reproduce
  - Browser and OS
  - Screenshots (optional)
- Link to GitHub issues (if public)

#### 7.3 Feature Requests
**Content:**
- Feature request form
- Guidelines for good requests
- Voting on existing requests (future)
- Roadmap visibility (future)

#### 7.4 Community Forum (Future)
**Placeholder content:**
- "Community forum coming soon!"
- Benefits of community
- How to participate
- Link to Discord/Slack (when available)

---

## 🎨 UI/UX Design

### Layout Structure

**Page Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ Header: "Help Center"                                   │
│ Subtitle: "Learn how to make the most of your budget"  │
├─────────────┬───────────────────────────────────────────┤
│             │                                           │
│  Sidebar    │  Main Content Area                        │
│  Navigation │                                           │
│             │  - Breadcrumbs                            │
│  - Getting  │  - Page Title                             │
│    Started  │  - Content                                │
│  - Features │  - Related Articles                       │
│  - Tutorial │  - Was this helpful? (feedback)           │
│  - Wizards  │                                           │
│  - FAQ      │                                           │
│  - Support  │                                           │
│             │                                           │
└─────────────┴───────────────────────────────────────────┘
```

**Mobile Layout:**
- Dropdown navigation (like Settings mobile nav)
- Collapsible sections
- Sticky header with back button
- Bottom navigation for prev/next article

### Component Design

**Sidebar Navigation:**
- Collapsible sections
- Active state highlighting
- Icon for each section
- Badge for "New" content
- Search bar at top

**Content Area:**
- Clean typography
- Code blocks for examples
- Screenshots with captions
- Callout boxes for tips/warnings
- Step-by-step numbered lists
- Expandable sections for details

**Wizard UI:**
- Progress indicator (Step X of Y)
- Previous/Next buttons
- Skip option
- Save progress
- Visual feedback
- Confirmation before exit

**Search Functionality:**
- Full-text search across all content
- Suggested articles
- Recent searches
- Popular articles

---

## 🔧 Technical Implementation

### File Structure

```
src/
├── app/(dashboard)/
│   └── help/
│       ├── layout.tsx                    # Help Center layout with sidebar
│       ├── page.tsx                      # Help Center home/overview
│       ├── getting-started/
│       │   ├── page.tsx                  # Getting Started overview
│       │   ├── welcome/page.tsx
│       │   ├── quick-start/page.tsx
│       │   ├── core-concepts/page.tsx
│       │   └── first-budget/page.tsx
│       ├── features/
│       │   ├── page.tsx                  # Features overview
│       │   ├── dashboard/page.tsx
│       │   ├── accounts/page.tsx
│       │   ├── categories/page.tsx
│       │   ├── transactions/page.tsx
│       │   ├── money-movement/page.tsx
│       │   ├── csv-import/page.tsx
│       │   ├── merchants/page.tsx
│       │   ├── goals/page.tsx
│       │   ├── loans/page.tsx
│       │   ├── pending-checks/page.tsx
│       │   ├── income/page.tsx
│       │   ├── reports/page.tsx
│       │   └── advanced/
│       │       ├── page.tsx
│       │       ├── category-types/page.tsx
│       │       ├── priorities/page.tsx
│       │       ├── smart-allocation/page.tsx
│       │       └── income-buffer/page.tsx
│       ├── tutorials/
│       │   ├── page.tsx                  # Tutorials overview
│       │   ├── first-budget/page.tsx
│       │   ├── importing/page.tsx
│       │   ├── irregular-income/page.tsx
│       │   ├── debt-payoff/page.tsx
│       │   ├── auto-categorization/page.tsx
│       │   ├── smart-allocation/page.tsx
│       │   └── emergency-fund/page.tsx
│       ├── wizards/
│       │   ├── page.tsx                  # Wizards overview
│       │   ├── budget-setup/page.tsx
│       │   ├── income-setup/page.tsx
│       │   ├── category-types/page.tsx
│       │   ├── smart-allocation/page.tsx
│       │   └── income-buffer/page.tsx
│       ├── faq/
│       │   ├── page.tsx                  # FAQ overview with search
│       │   ├── general/page.tsx
│       │   ├── envelope-budgeting/page.tsx
│       │   ├── transactions/page.tsx
│       │   ├── money-movement/page.tsx
│       │   ├── import-export/page.tsx
│       │   ├── advanced/page.tsx
│       │   └── troubleshooting/page.tsx
│       └── support/
│           ├── page.tsx                  # Support overview
│           ├── contact/page.tsx
│           ├── report-bug/page.tsx
│           └── feature-request/page.tsx
├── components/
│   └── help/
│       ├── HelpSidebar.tsx              # Sidebar navigation
│       ├── HelpMobileNav.tsx            # Mobile dropdown nav
│       ├── HelpSearch.tsx               # Search component
│       ├── Breadcrumbs.tsx              # Breadcrumb navigation
│       ├── ArticleContent.tsx           # Article wrapper
│       ├── RelatedArticles.tsx          # Related content
│       ├── WasThisHelpful.tsx           # Feedback component
│       ├── Wizard.tsx                   # Wizard container
│       ├── WizardStep.tsx               # Individual wizard step
│       ├── WizardProgress.tsx           # Progress indicator
│       ├── CodeBlock.tsx                # Code examples
│       ├── Screenshot.tsx               # Image with caption
│       ├── Callout.tsx                  # Tip/Warning boxes
│       ├── StepList.tsx                 # Numbered steps
│       └── FAQItem.tsx                  # Expandable FAQ item
└── lib/
    └── help-content/
        ├── getting-started.tsx          # Content for getting started
        ├── features.tsx                 # Content for features
        ├── tutorials.tsx                # Content for tutorials
        ├── faq.tsx                      # FAQ content
        └── search.ts                    # Search functionality
```

### Database Schema (if needed)

**Table: `help_feedback`**
```sql
CREATE TABLE help_feedback (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  article_path TEXT NOT NULL,
  was_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Table: `wizard_progress`**
```sql
CREATE TABLE wizard_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  wizard_name TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  data JSONB,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, wizard_name)
);
```

### API Endpoints

**Help Feedback:**
- `POST /api/help/feedback` - Submit article feedback
- `GET /api/help/feedback/stats` - Get feedback statistics (admin)

**Wizard Progress:**
- `GET /api/wizards/:name/progress` - Get wizard progress
- `POST /api/wizards/:name/progress` - Save wizard progress
- `DELETE /api/wizards/:name/progress` - Reset wizard

**Search:**
- `GET /api/help/search?q=query` - Search help content

---

## 📊 Content Priority & Phasing

### Phase 1: Foundation (Week 1-2)
**Goal:** Basic help center structure and essential content

**Deliverables:**
1. ✅ Help Center layout with sidebar navigation
2. ✅ Getting Started section (all 4 pages)
3. ✅ Core Features documentation (Dashboard, Accounts, Categories, Transactions)
4. ✅ Basic FAQ (20-30 most common questions)
5. ✅ Support section (Contact, Report Bug)
6. ✅ Add Help Center to sidebar navigation

**Priority:** HIGH - Users need basic help immediately

### Phase 2: Wizards (Week 3-4)
**Goal:** Interactive setup wizards for new users

**Deliverables:**
1. ✅ Wizard framework (components, progress tracking)
2. ✅ Initial Budget Setup Wizard (auto-run for new users)
3. ✅ Income Setup Wizard
4. ✅ Category Types Setup Wizard
5. ✅ Smart Allocation Setup Wizard
6. ✅ Income Buffer Setup Wizard
7. ✅ Wizard progress persistence

**Priority:** HIGH - Critical for onboarding

### Phase 3: Tutorials (Week 5-6)
**Goal:** Detailed step-by-step tutorials

**Deliverables:**
1. ✅ Tutorial framework (consistent layout, screenshots)
2. ✅ Setting Up Your First Budget
3. ✅ Importing Transactions
4. ✅ Managing Irregular Income
5. ✅ Tracking Debt Payoff
6. ✅ Setting Up Auto-Categorization
7. ✅ Using Smart Allocation
8. ✅ Building an Emergency Fund

**Priority:** MEDIUM - Helpful but not blocking

### Phase 4: Complete Features Documentation (Week 7-8)
**Goal:** Document all features in detail

**Deliverables:**
1. ✅ Money Movement (all tabs)
2. ✅ CSV Import
3. ✅ Merchants & Auto-Categorization
4. ✅ Goals
5. ✅ Loans & Debt Tracking
6. ✅ Pending Checks
7. ✅ Income Settings
8. ✅ Reports & Analytics
9. ✅ Advanced Features (all 4)

**Priority:** MEDIUM - Users can discover features, but help is valuable

### Phase 5: Enhanced FAQ & Search (Week 9-10)
**Goal:** Comprehensive FAQ and search functionality

**Deliverables:**
1. ✅ Complete FAQ (all 7 sections, 100+ questions)
2. ✅ Search functionality
3. ✅ Related articles suggestions
4. ✅ Popular articles tracking
5. ✅ Feedback system ("Was this helpful?")

**Priority:** MEDIUM - Improves discoverability

### Phase 6: Polish & Optimization (Week 11-12)
**Goal:** Improve UX and add nice-to-haves

**Deliverables:**
1. ✅ Screenshots for all tutorials
2. ✅ Video tutorial placeholders
3. ✅ Community forum placeholder
4. ✅ Feature request system
5. ✅ Analytics on help usage
6. ✅ A/B testing on wizard flows
7. ✅ Mobile optimization

**Priority:** LOW - Nice to have, not critical

---

## 🎯 Success Metrics

### User Engagement
- **Help Center visits** - Track unique visitors
- **Time spent** - Average time in Help Center
- **Pages per session** - How many articles do users read?
- **Search usage** - How often is search used?
- **Popular articles** - Which content is most valuable?

### Wizard Completion
- **Wizard starts** - How many users start each wizard?
- **Wizard completions** - How many finish?
- **Drop-off points** - Where do users abandon?
- **Time to complete** - How long does each wizard take?

### Support Reduction
- **Support tickets** - Decrease in support requests
- **Common questions** - Are FAQ answers reducing tickets?
- **Bug reports** - Quality of bug reports (better info = faster fixes)

### User Satisfaction
- **Feedback ratings** - "Was this helpful?" responses
- **Feature adoption** - Do wizards increase feature usage?
- **User retention** - Do users who complete wizards stick around?

---

## 🚀 Implementation Checklist

### Phase 1: Foundation
- [ ] Create Help Center layout component
- [ ] Create HelpSidebar component
- [ ] Create HelpMobileNav component
- [ ] Add Help Center to app sidebar navigation
- [ ] Create Getting Started pages (4 pages)
- [ ] Create core Features pages (4 pages)
- [ ] Create basic FAQ page with 20-30 questions
- [ ] Create Support pages (Contact, Report Bug)
- [ ] Add breadcrumb navigation
- [ ] Add "Was this helpful?" feedback component
- [ ] Test on mobile and desktop

### Phase 2: Wizards
- [ ] Create Wizard framework components
- [ ] Create wizard progress tracking (database + API)
- [ ] Create Initial Budget Setup Wizard
- [ ] Create Income Setup Wizard
- [ ] Create Category Types Setup Wizard
- [ ] Create Smart Allocation Setup Wizard
- [ ] Create Income Buffer Setup Wizard
- [ ] Add wizard triggers (new user, feature enable)
- [ ] Add wizard re-run from Help Center
- [ ] Test all wizard flows
- [ ] Add wizard progress persistence

### Phase 3: Tutorials
- [ ] Create tutorial layout template
- [ ] Create 7 tutorial pages
- [ ] Add screenshots to tutorials
- [ ] Add estimated time to each tutorial
- [ ] Add "Next steps" to each tutorial
- [ ] Link tutorials from relevant features
- [ ] Test tutorial flows

### Phase 4: Complete Features Documentation
- [ ] Document Money Movement (3 tabs)
- [ ] Document CSV Import
- [ ] Document Merchants & Auto-Categorization
- [ ] Document Goals
- [ ] Document Loans
- [ ] Document Pending Checks
- [ ] Document Income Settings
- [ ] Document Reports
- [ ] Document Advanced Features (4 features)
- [ ] Add feature-flag awareness to docs

### Phase 5: Enhanced FAQ & Search
- [ ] Expand FAQ to 100+ questions (7 sections)
- [ ] Implement search functionality
- [ ] Add search suggestions
- [ ] Add popular articles tracking
- [ ] Add related articles component
- [ ] Implement feedback system
- [ ] Create feedback analytics dashboard

### Phase 6: Polish & Optimization
- [ ] Add screenshots to all tutorials
- [ ] Create video tutorial placeholders
- [ ] Add community forum placeholder
- [ ] Implement feature request system
- [ ] Add help usage analytics
- [ ] Optimize for mobile
- [ ] A/B test wizard flows
- [ ] Performance optimization

---

## 📝 Content Writing Guidelines

### Tone & Voice
- **Friendly and approachable** - Not corporate or stuffy
- **Clear and concise** - Short sentences, simple words
- **Encouraging** - "You've got this!" not "This is complicated"
- **Action-oriented** - Tell users what to do, not just what things are

### Structure
- **Start with the goal** - What will the user accomplish?
- **Use numbered steps** - For sequential processes
- **Use bullet points** - For lists and options
- **Add examples** - Real-world scenarios
- **Include screenshots** - Show, don't just tell
- **End with next steps** - What should the user do next?

### Formatting
- **Headings** - Clear hierarchy (H1, H2, H3)
- **Bold** - For important terms and UI elements
- **Code blocks** - For technical examples
- **Callouts** - For tips, warnings, and notes
- **Links** - To related articles and features

### Accessibility
- **Alt text** - For all images
- **Descriptive links** - Not "click here"
- **Keyboard navigation** - All interactive elements
- **Screen reader friendly** - Proper heading structure

---

## 🔗 Integration Points

### Contextual Help Links
Add "Learn more" links throughout the app that deep-link to relevant help articles:

**Dashboard:**
- "What is Available to Save?" → Help article
- "Understanding your summary" → Help article

**Categories:**
- "What are category types?" → Help article
- "How do priorities work?" → Help article

**Money Movement:**
- "How does Smart Allocation work?" → Help article
- "What's the difference between Allocate and Transfer?" → FAQ

**Import:**
- "Preparing your CSV file" → Tutorial
- "Handling duplicates" → Help article

**Settings:**
- Each feature toggle → Help article about that feature

### Wizard Triggers
- **New user signup** → Initial Budget Setup Wizard
- **First visit to Income page** → Income Setup Wizard
- **Enable Category Types** → Category Types Setup Wizard
- **Enable Smart Allocation** → Smart Allocation Setup Wizard
- **Enable Income Buffer** → Income Buffer Setup Wizard

### In-App Notifications
- **Wizard available** - "Complete the Budget Setup Wizard to get started!"
- **New help content** - "New tutorial: Managing Irregular Income"
- **Tip of the day** - Random helpful tip from help content

---

## 🎨 Visual Design Notes

### Color Scheme
- Use existing app theme colors
- Callout boxes:
  - **Tip:** Blue background
  - **Warning:** Yellow background
  - **Important:** Red background
  - **Note:** Gray background

### Icons
- Use lucide-react icons consistently
- Help Center icon: `HelpCircle` or `BookOpen`
- Wizard icon: `Wand2` or `Sparkles`
- Tutorial icon: `GraduationCap` or `BookOpen`
- FAQ icon: `MessageCircleQuestion`
- Support icon: `LifeBuoy` or `Mail`

### Typography
- Use existing app typography
- Code examples: Monospace font
- Headings: Bold, larger sizes
- Body: Regular weight, readable size

---

## 📦 Deliverables Summary

### Documentation
1. ✅ This implementation plan
2. Content outline for all sections
3. Writing guidelines
4. Screenshot specifications

### Code
1. Help Center layout and navigation
2. 50+ help article pages
3. 5 interactive wizards
4. Search functionality
5. Feedback system
6. Analytics tracking

### Content
1. Getting Started (4 articles)
2. Features (13+ articles)
3. Tutorials (7 detailed guides)
4. FAQ (100+ questions)
5. Support resources

### Testing
1. All wizard flows
2. Mobile responsiveness
3. Search functionality
4. Navigation and links
5. Accessibility compliance

---

## 🎯 Next Steps

1. **Review and approve this plan**
2. **Begin Phase 1 implementation** (Foundation)
3. **Create content outline** for Getting Started section
4. **Design wizard UI mockups**
5. **Set up analytics tracking**
6. **Create screenshot template**
7. **Start writing first articles**

---

**Questions? Feedback? Let's discuss!**

