# Automatic Import Setup Guide

## Quick Start

Follow these steps to get automatic transaction imports working:

### Step 1: Run Database Migration

1. Open your Supabase SQL Editor: https://app.supabase.com/project/_/sql
2. Copy the contents of `migrations/046_add_automatic_imports.sql`
3. Paste and run the migration
4. Verify tables were created:
   ```sql
   SELECT * FROM automatic_import_setups LIMIT 1;
   SELECT * FROM queued_imports LIMIT 1;
   ```

### Step 2: Set Up Email Webhook

Choose one email service provider:

#### Option A: SendGrid (Easiest)

1. Sign up: https://sendgrid.com (free tier available)
2. Go to: Settings → Inbound Parse
3. Click "Add Host & URL"
4. Configure:
   - **Subdomain:** `imports` (or your choice)
   - **Domain:** Your domain (e.g., `yourdomain.com`)
   - **Destination URL:** `https://yourdomain.com/api/webhooks/email-import`
5. Add MX records to your DNS (shown in SendGrid dashboard)
6. Test by sending an email to `test@imports.yourdomain.com`

#### Option B: Postmark (Simple)

1. Sign up: https://postmarkapp.com
2. Go to: Inbound → Add Server
3. Set webhook URL: `https://yourdomain.com/api/webhooks/email-import`
4. Configure DNS records as shown
5. Test by sending an email

#### Option C: AWS SES (Advanced)

1. Set up AWS SES in your AWS account
2. Create S3 bucket for email storage
3. Configure SES to receive emails
4. Set up Lambda function to process emails
5. Lambda should POST to: `https://yourdomain.com/api/webhooks/email-import`

### Step 3: Test the Feature

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to:** `http://localhost:3000/settings/automatic-imports`

3. **Create Email Import Setup:**
   - Click "Add Import Setup"
   - Select "Email Import"
   - Choose target account
   - Click "Create Setup"
   - Copy the generated email address

4. **Test Email Forwarding:**
   - Forward a test bank statement email (with PDF/CSV attachment) to the generated address
   - Check `/imports/queue` to see queued transactions
   - Review and approve transactions

### Step 4: Add Navigation (Optional)

Add links to your navigation menu:

```tsx
// In your settings page or navigation component
<Link href="/settings/automatic-imports">
  Automatic Imports
</Link>

<Link href="/imports/queue">
  Import Queue
</Link>
```

---

## Production Deployment Checklist

- [ ] Database migration applied to production
- [ ] Email webhook configured in production
- [ ] Webhook URL is publicly accessible
- [ ] Environment variables set in production
- [ ] Test email forwarding works
- [ ] Queue review page accessible
- [ ] Error monitoring set up

---

## Troubleshooting

### Email Not Processing

1. **Check webhook URL:**
   - Verify URL is correct: `https://yourdomain.com/api/webhooks/email-import`
   - Test with: `curl -X POST https://yourdomain.com/api/webhooks/email-import`

2. **Check email service logs:**
   - SendGrid: Check Activity → Inbound Parse
   - Postmark: Check Inbound → Activity
   - AWS SES: Check CloudWatch logs

3. **Check application logs:**
   - Look for errors in your application logs
   - Check Supabase logs for database errors

### Transactions Not Queuing

1. **Check import setup:**
   - Verify setup is active: `is_active = true`
   - Check for errors: `last_error` field

2. **Check file format:**
   - Ensure email has PDF or CSV attachment
   - Verify file is not corrupted

3. **Check deduplication:**
   - Transactions may be duplicates
   - Check `imported_transactions` table for existing hashes

### Queue Not Showing

1. **Check permissions:**
   - User must be editor or owner
   - Verify account access

2. **Check status:**
   - Queued imports must have status `pending` or `reviewing`
   - Check `queued_imports` table directly

---

## Support

- **Implementation Plan:** See `docs/AUTOMATIC_TRANSACTION_IMPORT_PLAN.md`
- **Credential Guide:** See `docs/AUTOMATIC_IMPORT_CREDENTIALS.md`
- **Implementation Summary:** See `docs/AUTOMATIC_IMPORT_IMPLEMENTATION_SUMMARY.md`

---

## Next Steps

Once email import is working:

1. **Monitor Usage:**
   - Check queue regularly
   - Review error logs
   - Track user adoption

2. **Add API Integrations (Phase 2):**
   - Follow credential guide for Plaid, Finicity, etc.
   - Implement integration services
   - Add to premium features

3. **Enhance Features:**
   - Add batch approval
   - Improve queue UI
   - Add cost tracking
   - Add integration marketplace
