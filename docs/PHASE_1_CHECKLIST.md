# Phase 1: Foundation - Implementation Checklist

**Goal:** Establish monthly funding tracking and feature flag system  
**Duration:** 3-4 weeks  
**Status:** Not Started

---

## Week 1: Database & Backend Foundation

### Database Tasks
- [ ] Create `category_monthly_funding` table
  - [ ] Write migration script (up)
  - [ ] Write migration script (down/rollback)
  - [ ] Add indexes for performance
  - [ ] Test migration on development database
  - [ ] Verify constraints and foreign keys

- [ ] Create `user_feature_flags` table
  - [ ] Write migration script (up)
  - [ ] Write migration script (down/rollback)
  - [ ] Add indexes for performance
  - [ ] Test migration on development database
  - [ ] Verify constraints and foreign keys

- [ ] Update `settings` table
  - [ ] Add `income_type` column
  - [ ] Add `auto_fund_from_buffer` column
  - [ ] Add `show_onboarding` column
  - [ ] Write migration script
  - [ ] Test migration on development database

- [ ] Create `scheduled_jobs` table
  - [ ] Write migration script (up)
  - [ ] Write migration script (down/rollback)
  - [ ] Add indexes for performance
  - [ ] Test migration on development database
  - [ ] Verify constraints

### Backend API - Monthly Funding
- [ ] Create `GET /api/monthly-funding/:month` endpoint
  - [ ] Implement route handler
  - [ ] Add authentication middleware
  - [ ] Add feature flag check
  - [ ] Return funding status for all categories
  - [ ] Write unit tests
  - [ ] Test with Postman/curl

- [ ] Create `POST /api/allocations/manual` endpoint
  - [ ] Implement route handler
  - [ ] Add authentication middleware
  - [ ] Update category balance
  - [ ] Record monthly funding (if feature enabled)
  - [ ] Write unit tests
  - [ ] Test with Postman/curl

- [ ] Create helper functions
  - [ ] `getFundedThisMonth(userId, categoryId, month)` - Get funded amount
  - [ ] `recordMonthlyFunding(userId, categoryId, month, amount)` - Record funding
  - [ ] `getOrCreateMonthlyFunding(userId, categoryId, month)` - Get or create record
  - [ ] Write unit tests for each helper

### Backend API - Scheduled Jobs
- [ ] Create scheduled job utilities
  - [ ] `updateJobStatus(jobName, status, duration, error)` - Update job record
  - [ ] `getJobStatus(jobName)` - Get current job status
  - [ ] `runScheduledJob(jobName, jobFunction)` - Wrapper for job execution
  - [ ] Write unit tests

- [ ] Create `GET /api/admin/scheduled-jobs` endpoint
  - [ ] Implement route handler
  - [ ] Add authentication middleware (admin only)
  - [ ] Return all jobs with status
  - [ ] Write unit tests

- [ ] Implement monthly funding rollover job
  - [ ] Create job function `monthlyFundingRollover()`
  - [ ] Create new monthly funding records for new month
  - [ ] Set up cron trigger (1st of month, 00:00 UTC)
  - [ ] Test job execution
  - [ ] Verify job status tracking

---

## Week 2: Feature Flag System & Frontend Foundation

### Backend API - Feature Flags
- [ ] Create `GET /api/features` endpoint
  - [ ] Implement route handler
  - [ ] Add authentication middleware
  - [ ] Return all features with enabled status
  - [ ] Include feature metadata (name, description, dependencies)
  - [ ] Write unit tests
  - [ ] Test with Postman/curl

- [ ] Create `POST /api/features/:feature_name/toggle` endpoint
  - [ ] Implement route handler
  - [ ] Add authentication middleware
  - [ ] Validate feature name
  - [ ] Check dependencies (can't disable if other features depend on it)
  - [ ] Update or create feature flag record
  - [ ] Return updated status
  - [ ] Write unit tests
  - [ ] Test with Postman/curl

- [ ] Create feature flag middleware
  - [ ] `requireFeature(featureName)` - Middleware to check if feature enabled
  - [ ] Cache feature flags in request context
  - [ ] Write unit tests

### Frontend - Feature Context
- [ ] Create `FeatureContext`
  - [ ] Define context shape (features, loading, error, toggleFeature)
  - [ ] Create provider component
  - [ ] Fetch features on mount
  - [ ] Handle loading and error states
  - [ ] Provide toggle function

- [ ] Create `useFeature()` hook
  - [ ] Accept feature name as parameter
  - [ ] Return enabled status
  - [ ] Return loading state
  - [ ] Handle feature not found

- [ ] Create `useFeatures()` hook
  - [ ] Return all features
  - [ ] Return loading state
  - [ ] Return toggle function

---

## Week 3: Help System & UI Components

### Frontend - Help Components
- [ ] Create `HelpTooltip` component
  - [ ] Accept content prop
  - [ ] Use shadcn/ui Tooltip
  - [ ] Add info icon
  - [ ] Style consistently
  - [ ] Write component tests

- [ ] Create `HelpPanel` component
  - [ ] Accept title and content props
  - [ ] Use shadcn/ui Collapsible
  - [ ] Add expand/collapse animation
  - [ ] Add "Learn more" link support
  - [ ] Style consistently
  - [ ] Write component tests

- [ ] Create `FeatureToggle` component
  - [ ] Accept feature object and onChange
  - [ ] Display feature name and description
  - [ ] Show toggle switch
  - [ ] Show dependencies
  - [ ] Show warning dialog if data loss
  - [ ] Handle loading state
  - [ ] Write component tests

### Frontend - Settings Page
- [ ] Create Settings > Features page
  - [ ] Create route `/settings/features`
  - [ ] Add to settings navigation
  - [ ] Display all available features
  - [ ] Group features by level (basic, intermediate, advanced, power)
  - [ ] Show "Recommended" badges
  - [ ] Show dependency chains
  - [ ] Handle feature toggling
  - [ ] Show success/error messages

- [ ] Update Settings navigation
  - [ ] Add "Features" link
  - [ ] Add icon
  - [ ] Highlight when active

---

## Week 4: Monthly Funding UI & Testing

### Frontend - Monthly Funding Display
- [ ] Create `FundingProgressIndicator` component (basic version)
  - [ ] Accept category and month props
  - [ ] Fetch funding data
  - [ ] Display "Funded This Month: $X of $Y"
  - [ ] Display progress bar
  - [ ] Show percentage
  - [ ] Handle loading state
  - [ ] Write component tests

- [ ] Update category cards
  - [ ] Add funding progress indicator (when feature enabled)
  - [ ] Show/hide based on feature flag
  - [ ] Update layout to accommodate new info
  - [ ] Test responsive design

- [ ] Update allocation dialog
  - [ ] Show current monthly funding status
  - [ ] Show remaining to fund this month
  - [ ] Update after allocation
  - [ ] Handle feature flag (show/hide)

### Documentation
- [ ] Write help text for Monthly Funding Tracking
  - [ ] Tooltip text
  - [ ] Help panel content
  - [ ] Feature description for settings page

- [ ] Create `/help/monthly-funding-tracking` page
  - [ ] What is it?
  - [ ] How does it work?
  - [ ] Benefits
  - [ ] Examples
  - [ ] FAQ

- [ ] Create onboarding flow
  - [ ] Welcome message when feature enabled
  - [ ] Quick tour of new UI elements
  - [ ] Link to help documentation

### Testing
- [ ] Unit tests
  - [ ] All backend helper functions
  - [ ] All API endpoints
  - [ ] All frontend components
  - [ ] Feature context and hooks

- [ ] Integration tests
  - [ ] Allocation flow with monthly funding
  - [ ] Feature flag toggling
  - [ ] Month rollover (funded_amount resets)

- [ ] User acceptance testing
  - [ ] Enable Monthly Funding Tracking
  - [ ] Allocate funds multiple times in one month
  - [ ] Verify no refunding of paid bills
  - [ ] Check funding progress display
  - [ ] Disable feature and verify data preserved

- [ ] Performance testing
  - [ ] API response times
  - [ ] Dashboard load time with feature enabled
  - [ ] Database query performance

---

## Deployment Checklist

- [ ] Code review completed
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Database migrations tested
- [ ] Rollback plan documented
- [ ] Deploy to staging
- [ ] Smoke test on staging
- [ ] Performance test on staging
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Collect user feedback

---

## Success Criteria

- ✅ Monthly funding tracking works correctly
- ✅ Feature flag system functional
- ✅ Settings > Features page complete
- ✅ Help system components created
- ✅ All tests passing (80%+ coverage)
- ✅ No performance degradation
- ✅ Documentation complete
- ✅ Zero critical bugs

---

## Notes & Decisions

### Design Decisions
- Monthly funding tracking is opt-in (not enabled by default)
- Feature flags stored in database (not config file) for per-user control
- Help tooltips use (i) icon for consistency
- Feature toggle warnings only for features with data loss risk

### Technical Decisions
- Use Supabase RLS for feature flag access control
- Cache feature flags in React context (don't fetch on every render)
- Monthly funding records created on-demand (not pre-created)
- Month rollover handled by cron job (creates new records with funded_amount = 0)
- Scheduled jobs tracked in `scheduled_jobs` table for monitoring and alerting
- Use Supabase Edge Functions with cron triggers for scheduled jobs

### Open Questions
- [ ] Should we auto-enable Monthly Funding Tracking for new users after 1 month?
- [ ] Should we show a banner promoting features to eligible users?
- [ ] How aggressive should feature recommendations be?

---

**Last Updated:** 2025-11-22
**Status:** In Progress
**Next Review:** Weekly


