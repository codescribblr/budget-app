# Budget Tracking Application

A comprehensive budget tracking application built with Next.js, React, TypeScript, and SQLite. This application uses an envelope budgeting system to help you manage your finances, track expenses, and analyze spending patterns.

## Features

### 📊 Dashboard
- **Summary Cards**: View total monies, envelope balances, credit card balances, pending checks, and current savings at a glance
- **Budget Categories (Envelopes)**: Manage your budget categories with monthly amounts and current balances
- **Accounts**: Track bank account balances with option to include/exclude from totals
- **Credit Cards**: Monitor credit cards with automatic balance calculation (credit limit - available credit)
- **Pending Checks**: Track pending checks that affect your available balance

### 💰 Transactions
- **Add Transactions**: Enter expenses with date and description
- **Category Splits**: Split a single transaction across multiple budget categories
- **Edit & Delete**: Modify or remove transactions with automatic envelope balance adjustments
- **Transaction History**: View all transactions with category breakdowns

### 🔄 Money Movement
- **Transfer Between Envelopes**: Move funds from one budget category to another
- **Allocate Income**: Distribute paychecks across envelopes
  - Use monthly amounts (allocate exact budget amounts)
  - Distribute proportionally (split income based on budget ratios)
  - Manual allocation with live preview

### 📈 Reports & Analytics
- **Date Range Filtering**: Analyze spending by week, month, quarter, year, or custom range
- **Spending by Category**: See which categories consume the most budget with visual progress bars
- **Top Merchants**: Identify where you spend most frequently with transaction counts and averages

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with better-sqlite3
- **Development**: Turbopack for fast refresh

## Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Seed the database with initial data:
```bash
npm run seed
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

### Access from Mobile
To access from your phone on the same network:
1. Find your computer's local IP address
2. On your phone, navigate to `http://[YOUR-IP]:3000`
3. Example: `http://192.168.1.100:3000`

## Database Management

### Backup Database
Create a timestamped backup of your current database:
```bash
npm run backup-db
```
Backups are stored in `database/backups/` directory.

### Restore Database
List available backups:
```bash
npm run restore-db
```

Restore a specific backup:
```bash
npm run restore-db budget-backup-2025-10-14T19-40-05-536Z.db
```

### Reset to Initial Seed Data
Reset the database to the original seed data (backs up current database first):
```bash
npm run reset-db
```

**⚠️ Warning**: This will delete all transactions and changes you've made. Your current database will be backed up automatically before reset.

## How It Works

### Envelope Budgeting System
This application uses the envelope budgeting method:
1. **Income**: You receive paychecks (income)
2. **Allocation**: Distribute income into virtual "envelopes" (budget categories)
3. **Spending**: When you spend money, it comes out of the appropriate envelope(s)
4. **Tracking**: Your envelope balances show how much budget remains in each category

### Current Savings Calculation
```
Current Savings = Total Monies - Total Envelopes - Credit Card Balances - Pending Checks
```

### Transaction Flow
1. **Add Transaction**: Enter expense with category splits
2. **Automatic Updates**: Envelope balances automatically decrease
3. **Edit Transaction**: Old splits are reversed, new splits applied
4. **Delete Transaction**: Amounts are restored to envelopes

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed database with initial data
- `npm run backup-db` - Backup current database
- `npm run restore-db` - Restore from backup
- `npm run reset-db` - Reset to seed data
