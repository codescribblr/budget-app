# Variable Income Enhancements - Quick Reference

This is a condensed reference guide for the Variable Income Enhancements project. For full details, see [VARIABLE_INCOME_IMPLEMENTATION.md](./VARIABLE_INCOME_IMPLEMENTATION.md).

---

## 🎯 Core Concepts (TL;DR)

### 1. Monthly Funding Tracking
**Problem:** System refunds already-paid bills when you allocate again  
**Solution:** Track "funded this month" separately from "current balance"  
**Benefit:** Allocate multiple times per month without refunding paid bills

### 2. Category Types

| Type | Purpose | Example | Progress Metric |
|------|---------|---------|-----------------|
| **Monthly Expense** | Regular monthly spending | Groceries, Gas | Spending vs budget |
| **Accumulation** | Save for periodic expenses | Annual insurance | YTD funded vs annual target |
| **Target Balance** | Build a buffer | Emergency fund | Balance vs target |

### 3. Priority System
**Purpose:** Define funding order (1 = highest priority)  
**Use Case:** Ensure essentials funded first when money is limited

### 4. Smart Allocation
**Purpose:** Auto-allocate funds by priority  
**Features:** Respects monthly funding, handles catch-up, stops at targets

### 5. Income Buffer
**Purpose:** Smooth irregular income into regular monthly rhythm  
**How:** Store large payments, release monthly

---

## 📊 Feature Flags

All features are **opt-in** to keep the app simple for basic users.

| Feature | Dependencies | Best For |
|---------|--------------|----------|
| Monthly Funding Tracking | None | Everyone (foundation) |
| Category Types | Monthly Funding Tracking | Users with periodic expenses |
| Priority System | Category Types | Variable income users |
| Smart Allocation | Priority System | Users with many categories |
| Income Buffer | Smart Allocation | Highly variable income |
| Advanced Reporting | Category Types | Data-driven users |

---

## 🗄️ Database Changes

### New Tables
- `category_monthly_funding` - Track funded amounts per month
- `user_feature_flags` - Track enabled features per user

### Modified Tables
- `categories` - Add type, priority, targets, notes
- `settings` - Add income_type, auto_fund_from_buffer

---

## 🚀 Implementation Phases

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| **1. Foundation** | 3-4 weeks | Monthly funding + feature flags | Tracking system, feature toggles |
| **2. Category Types** | 2-3 weeks | Three category types | Type-specific progress tracking |
| **3. Priority & Smart** | 3-4 weeks | Priority system + smart allocation | Automated allocation |
| **4. Income Buffer** | 2-3 weeks | Income smoothing | Buffer category, auto-fund |
| **5. Reporting** | 3-4 weeks | Analytics | Five report types |

**Total Timeline:** 12-16 weeks

---

## 🎨 UI Components

### New Components
- `CategoryTypeSelector` - Choose category type
- `PrioritySelector` - Set priority (1-10)
- `SmartAllocationWizard` - Preview and apply allocation
- `FundingProgressIndicator` - Type-aware progress display
- `FeatureToggle` - Enable/disable features
- `HelpTooltip` - Inline help text
- `HelpPanel` - Expandable help sections

---

## 🔌 API Endpoints

### Allocation
- `POST /api/allocations/smart-allocate` - Run smart allocation
- `POST /api/allocations/manual` - Manual allocation (with tracking)

### Monthly Funding
- `GET /api/monthly-funding/:month` - Get funding status for month
- `GET /api/monthly-funding/ytd/:category_id` - Get YTD funded

### Features
- `GET /api/features` - Get all features and status
- `POST /api/features/:feature_name/toggle` - Enable/disable feature

### Income Buffer
- `POST /api/income-buffer/add` - Add funds to buffer
- `POST /api/income-buffer/fund-month` - Fund month from buffer

---

## 🧪 Testing Checklist

### Phase 1
- [ ] Monthly funding tracking works
- [ ] Feature flags persist correctly
- [ ] Allocation doesn't refund paid bills
- [ ] Month rollover resets funded amounts

### Phase 2
- [ ] All three category types work
- [ ] YTD calculation correct for accumulation
- [ ] Target balance stops at target
- [ ] Progress displays correctly for each type

### Phase 3
- [ ] Priority sorting works
- [ ] Smart allocation funds by priority
- [ ] Catch-up works for accumulation
- [ ] Preview shows correct allocation

### Phase 4
- [ ] Income buffer stores funds
- [ ] Auto-fund suggestion appears
- [ ] Months of runway calculates correctly

### Phase 5
- [ ] All reports generate correctly
- [ ] Export functionality works
- [ ] Reports handle edge cases

---

## 📈 Success Metrics

### Adoption
- % users enabling each feature
- Feature combinations
- Time to first feature enabled

### Engagement
- Smart allocation usage frequency
- Categories with types/priorities set
- Report views per user

### Outcomes
- User retention by feature usage
- User satisfaction (NPS)
- Support ticket trends

---

## 🎓 Help System

### Locations
1. **Inline Tooltips** - Brief explanations (1-2 sentences)
2. **Help Panels** - Expandable detailed explanations
3. **Guided Tours** - Step-by-step walkthroughs
4. **Documentation Pages** - Comprehensive guides

### Key Help Topics
- What are category types?
- How does smart allocation work?
- When should I use the income buffer?
- Setting up priorities
- Understanding monthly funding tracking

---

## 👥 User Personas

### Sarah (Freelancer)
- Income: $2K-$8K/month (variable)
- Needs: Priority system, income buffer
- Features: All enabled

### Mike (Bi-weekly Salary)
- Income: $2K every 2 weeks (regular)
- Needs: Monthly funding tracking
- Features: Basic + monthly tracking

### Jennifer (Contract Worker)
- Income: $15K every 3-4 months (irregular)
- Needs: Income buffer, smart allocation
- Features: All enabled

### Tom (Regular Salary)
- Income: $5K/month (regular)
- Needs: Basic envelope budgeting
- Features: Basic only

---

## 🔗 Quick Links

- [Full Implementation Plan](./VARIABLE_INCOME_IMPLEMENTATION.md)
- [Documentation Index](./README.md)
- Database Migrations - See Appendix A in implementation plan
- API Specs - See Appendix B in implementation plan
- UI Mockups - See Appendix C in implementation plan
- User Workflows - See Appendix D in implementation plan

---

**Last Updated:** 2025-11-22
**Status:** Implementation Phase
**Branch:** `feature/variable-income-enhancements`

