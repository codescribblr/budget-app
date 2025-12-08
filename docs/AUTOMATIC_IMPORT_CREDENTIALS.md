# Automatic Import Credentials Acquisition Guide

This guide explains how to obtain API credentials for each automatic import integration option.

## 🔐 Encryption Key (Required)

**Important:** All API access tokens (like Teller access tokens) are encrypted before storage. You must set up an encryption key before using any integrations that store access tokens.

### Steps to Generate Encryption Key:

1. **Generate a random encryption key:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   This will output a 64-character hex string.

2. **Add to .env.local:**
   ```
   ENCRYPTION_KEY=your-generated-64-character-hex-string-here
   ```

3. **Security Notes:**
   - Keep this key secret and never commit it to version control
   - Use a different key for each environment (development, staging, production)
   - If you lose the key, you'll need to re-connect all integrations
   - The key must be exactly 64 characters (32 bytes in hex)
   - In production, this key is **required** - the app will error if not set

---

## Email Import (Free - Recommended for MVP)

**Resend API key required** if using Resend (which you already are!). Email import uses Resend's inbound email feature.

### Setup Steps:
1. Get your Resend API key (see below)
2. Add `RESEND_API_KEY` to `.env.local`
3. Set up email webhook endpoint: `https://yourdomain.com/api/webhooks/email-import`
4. Configure Resend inbound email and webhook

### Email Service Provider Options:

#### Option 1: Resend Inbound Email (Recommended - You're Already Using Resend!)

Since you're already using Resend for SMTP, this is the easiest option:

1. **Get Your Resend API Key:**
   - Go to https://resend.com/api-keys
   - Copy your existing API key (or create a new one)
   - Add to `.env.local`:
     ```
     RESEND_API_KEY=re_your-api-key-here
     ```

2. **Set Up Inbound Email Domain:**
   - Go to https://resend.com/emails/receiving
   - Click "Add Domain" or use the default `.resend.app` domain
   - **For custom domain:** Add the DNS records shown in Resend dashboard
   - **For `.resend.app` domain:** You'll get an address like `your-app@resend.app`
   - **Copy your receiving domain** (the domain part of your inbound address)
   - Add to `.env.local`:
     ```
     RESEND_RECEIVING_DOMAIN=your-app.resend.app
     ```
     Or for custom domain:
     ```
     RESEND_RECEIVING_DOMAIN=imports.yourdomain.com
     ```
   - **Important:** This domain is used to generate unique email addresses for each import setup

3. **Configure Webhook:**
   - Go to https://resend.com/webhooks
   - Click "Add Webhook"
   - Set **Endpoint URL:** `https://yourdomain.com/api/webhooks/email-import`
   - Select event: **`email.received`**
   - Click "Add Webhook"

4. **Get Your Inbound Email Address:**
   - Go to https://resend.com/emails/receiving
   - Find your inbound address (e.g., `your-app@resend.app`)
   - Or use a custom domain address (e.g., `imports@yourdomain.com`)

5. **Cost:** Free tier includes generous limits, then pay-as-you-go

**How It Works:**
- Resend sends a JSON webhook when an email is received
- The webhook handler automatically detects Resend format
- Attachments are fetched via Resend's Attachments API
- Download URLs are valid for 1 hour

**Documentation:**
- Inbound Email: https://resend.com/docs/dashboard/receiving/introduction
- Attachments API: https://resend.com/docs/dashboard/receiving/attachments
- Webhooks: https://resend.com/docs/dashboard/webhooks

#### Option 2: SendGrid Inbound Parse (Alternative)
1. Sign up at https://sendgrid.com
2. Go to Settings → Inbound Parse
3. Add new hostname: `imports.yourdomain.com`
4. Set POST URL: `https://yourdomain.com/api/webhooks/email-import`
5. Configure MX records as instructed
6. **Cost:** Free tier includes 100 emails/day

#### Option 3: AWS SES
1. Set up AWS SES in your AWS account
2. Create an S3 bucket for email storage
3. Configure SES to receive emails and store in S3
4. Set up Lambda function to process emails and call webhook
5. **Cost:** ~$0.10 per 1,000 emails

#### Option 4: Postmark Inbound
1. Sign up at https://postmarkapp.com
2. Go to Inbound → Add Server
3. Set webhook URL: `https://yourdomain.com/api/webhooks/email-import`
4. Configure DNS records
5. **Cost:** Free tier includes 100 emails/month

---

## Plaid Integration (Premium Feature)

**Cost:** $0.30 per transaction (after 100 free items/month)

### Steps to Get Credentials:

1. **Sign Up**
   - Go to https://dashboard.plaid.com/signup
   - Create a free account

2. **Create Application**
   - Go to Team Settings → Keys
   - Create a new application
   - Copy your `Client ID` and `Secret`

3. **Get Webhook Secret**
   - Go to Team Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhooks/plaid`
   - Copy the webhook secret

4. **Environment**
   - Start with `sandbox` for testing
   - Move to `development` for limited production testing
   - Use `production` for live users

5. **Add to .env.local:**
   ```
   PLAID_CLIENT_ID=your-client-id
   PLAID_SECRET=your-secret-key
   PLAID_ENV=sandbox
   PLAID_WEBHOOK_SECRET=your-webhook-secret
   ```

### Documentation:
- API Docs: https://plaid.com/docs/
- Dashboard: https://dashboard.plaid.com/

---

## Finicity Integration (Premium Feature)

**Cost:** $0.20-$0.30 per transaction

### Steps to Get Credentials:

1. **Sign Up**
   - Go to https://developer.finicity.com/
   - Create a developer account

2. **Create Application**
   - Go to My Apps → Create App
   - Copy your `App Key`, `Partner ID`, and `Partner Secret`

3. **Environment**
   - Use `sandbox` for testing
   - Use `production` for live users

4. **Add to .env.local:**
   ```
   FINICITY_APP_KEY=your-app-key
   FINICITY_PARTNER_ID=your-partner-id
   FINICITY_PARTNER_SECRET=your-partner-secret
   FINICITY_ENV=sandbox
   ```

### Documentation:
- API Docs: https://developer.finicity.com/
- Support: https://developer.finicity.com/support

---

## MX Integration (Premium Feature)

**Cost:** $0.15-$0.25 per transaction

### Steps to Get Credentials:

1. **Sign Up**
   - Go to https://dashboard.mx.com/signup
   - Create a developer account

2. **Create Application**
   - Go to Settings → API Credentials
   - Copy your `Client ID` and `API Secret`

3. **Environment**
   - Use `sandbox` for testing
   - Use `production` for live users

4. **Add to .env.local:**
   ```
   MX_CLIENT_ID=your-client-id
   MX_API_SECRET=your-api-secret
   MX_ENV=sandbox
   ```

### Documentation:
- API Docs: https://developer.mx.com/
- Dashboard: https://dashboard.mx.com/

---

## Teller Integration (Premium Feature - Lowest Cost)

**Cost:** $0.10-$0.20 per transaction

### Steps to Get Credentials:

1. **Sign Up**
   - Go to https://teller.io/
   - Create a developer account

2. **Create Application**
   - Go to Dashboard → Applications
   - Create a new application
   - Copy your **Application ID**

3. **Get Webhook Secret**
   - Go to Dashboard → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhooks/teller`
   - Copy the webhook signing secret

4. **Environment**
   - Use `sandbox` for testing
   - Use `production` for live users

5. **Get Client Certificate:**
   - When you create a Teller project, you'll receive a `teller.zip` file
   - This contains:
     - `cert.pem`: Your client certificate
     - `key.pem`: Your private key
   - **IMPORTANT:** Keep your private key secure and never commit it to version control
   - If you lose these files, you can revoke and regenerate them in the Teller Dashboard → Certificates

6. **Add to .env.local:**
   ```
   NEXT_PUBLIC_TELLER_APPLICATION_ID=your-application-id
   NEXT_PUBLIC_TELLER_ENV=sandbox
   TELLER_WEBHOOK_SECRET=your-webhook-secret
   TELLER_ENV=sandbox
   TELLER_CLIENT_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
   TELLER_CLIENT_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```
   
   **Note:** You need both `NEXT_PUBLIC_TELLER_ENV` (for client-side Teller Connect) and `TELLER_ENV` (for server-side API calls). They should have the same value.
   
   **Note:** For the certificate and key:
   - Copy the entire contents of `cert.pem` and `key.pem` files
   - Include the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines
   - Include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
   - Use `\n` for line breaks in the environment variable (or use a multi-line string)
   - Alternatively, you can store them as files and reference the paths (requires code changes)

### How It Works:

1. **User Connects Account:**
   - User clicks "Connect with Teller" button
   - Teller Connect OAuth flow opens
   - User authenticates with their bank
   - `onSuccess` callback receives `accessToken` and enrollment data

2. **Store Connection:**
   - Access token stored in `source_config` (should be encrypted)
   - Enrollment ID stored as `source_identifier`
   - Bank name and account numbers stored for display

3. **Fetch Transactions:**
   - Transactions fetched via Teller API using access token
   - Converted to `ParsedTransaction` format
   - Queued for review (same as email imports)

4. **Webhook Updates:**
   - Teller sends webhooks for new/updated transactions
   - Webhook handler verifies signature
   - Fetches and queues new transactions automatically

### Documentation:
- API Docs: https://teller.io/docs
- Teller Connect Guide: https://teller.io/docs/guides/connect
- React Library: https://github.com/tellerhq/teller-connect-react
- Dashboard: https://teller.io/dashboard

---

## Yodlee Integration (Premium Feature)

**Cost:** $0.25-$0.35 per transaction

### Steps to Get Credentials:

1. **Sign Up**
   - Go to https://developer.yodlee.com/
   - Create a developer account

2. **Create Application**
   - Go to Developer Portal → Applications
   - Create new application
   - Copy your `Client ID` and `Secret`

3. **Environment**
   - Use `sandbox` for testing
   - Use `production` for live users

4. **Add to .env.local:**
   ```
   YODLEE_CLIENT_ID=your-client-id
   YODLEE_SECRET=your-secret
   YODLEE_ENV=sandbox
   ```

### Documentation:
- API Docs: https://developer.yodlee.com/
- Support: https://developer.yodlee.com/support

---

## Implementation Priority

### Phase 1 (MVP - Start Here):
1. ✅ **Email Import** - No credentials needed, uses existing SMTP
2. ✅ Database migration and queue system
3. ✅ Basic UI for managing setups

### Phase 2 (Premium Features):
1. **Plaid** - Most reliable, highest cost
2. **Finicity** - Good alternative, better pricing
3. **MX** - Best categorization, competitive pricing

### Phase 3 (Cost Optimization):
1. **Teller** - Lowest cost option
2. **Yodlee** - Broader bank coverage

---

## Testing Credentials

All providers offer sandbox/test environments:
- Use sandbox credentials for development
- Test with sandbox banks before going live
- Switch to production credentials only when ready

---

## Security Best Practices

1. **Never commit credentials to git**
   - Use `.env.local` (already in .gitignore)
   - Use environment variables in production

2. **Rotate credentials regularly**
   - Change API keys every 90 days
   - Revoke old keys immediately

3. **Use least privilege**
   - Only request necessary permissions
   - Use read-only access when possible

4. **Monitor usage**
   - Set up alerts for unusual activity
   - Track costs per integration

---

## Cost Comparison

| Integration | Cost/Transaction | Free Tier | Best For |
|------------|------------------|-----------|----------|
| Email | $0.001 | Unlimited | Cost-conscious users |
| Teller | $0.10-0.20 | None | Supported banks, low cost |
| MX | $0.15-0.25 | None | Better categorization |
| Finicity | $0.20-0.30 | None | Credit unions, cost savings |
| Plaid | $0.30 | 100 items/mo | Maximum reliability |
| Yodlee | $0.25-0.35 | None | Broader coverage |

---

## Support

For issues with:
- **Email Import:** Check SMTP configuration and webhook setup
- **API Integrations:** Contact provider support or check their status pages
- **Implementation:** See `docs/AUTOMATIC_TRANSACTION_IMPORT_PLAN.md`
