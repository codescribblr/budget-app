# Teller Integration - Implementation Summary

## ✅ Completed Implementation

### Core Features
- ✅ Teller Connect OAuth flow integration
- ✅ Transaction fetching from Teller API
- ✅ Transaction queuing (same as email imports)
- ✅ Webhook handling for automatic updates
- ✅ Manual fetch capability
- ✅ Multi-account support per enrollment

### Components Created

#### 1. Teller Service (`src/lib/automatic-imports/providers/teller-service.ts`)
- `fetchTellerTransactions()` - Fetch transactions from Teller API
- `fetchTellerAccount()` - Get account details
- `fetchTellerAccounts()` - Get all accounts for enrollment
- `convertTellerTransactionToParsed()` - Convert Teller format to ParsedTransaction
- `fetchAndQueueTellerTransactions()` - Fetch and queue transactions

#### 2. Teller Connect Component (`src/components/automatic-imports/providers/TellerConnect.tsx`)
- React component using `teller-connect-react` library
- Handles OAuth flow
- Calls success callback with access token and enrollment data

#### 3. Create Teller Import Dialog (`src/components/automatic-imports/CreateTellerImportDialog.tsx`)
- UI for creating Teller import setup
- Integrates Teller Connect component
- Handles setup creation after OAuth success

#### 4. API Routes
- `POST /api/automatic-imports/teller/connect` - Handle Teller Connect success
- `POST /api/automatic-imports/teller/fetch` - Fetch transactions (internal)
- `POST /api/webhooks/teller` - Handle Teller webhooks
- `POST /api/automatic-imports/setups/[id]/fetch` - Manual fetch trigger

#### 5. Integration Selector (`src/components/automatic-imports/IntegrationSelector.tsx`)
- Updated to show Email and Teller options
- Allows users to choose integration type

### How It Works

1. **User Initiates Connection:**
   - User clicks "Add Import Setup" → Selects "Teller Integration"
   - Teller Connect component opens OAuth flow
   - User authenticates with their bank via Teller

2. **OAuth Success:**
   - `onSuccess` callback receives `authorization` object:
     ```typescript
     {
       accessToken: "token_xxx",
       enrollment: {
         id: "enr_xxx",
         institution: { name: "Chase" }
       },
       user: { id: "usr_xxx" }
     }
     ```

3. **Setup Creation:**
   - Access token stored in `source_config.access_token`
   - Enrollment ID stored as `source_identifier`
   - Bank name and account numbers stored
   - Initial transactions fetched and queued

4. **Automatic Updates:**
   - Teller sends `transactions.processed` webhook events
   - Webhook handler verifies signature
   - Fetches new transactions and queues them

5. **Queue Review:**
   - Transactions appear in `/imports/queue`
   - User reviews, edits, and approves
   - Approved transactions imported via existing flow

### Environment Variables Required

```bash
# Teller Application ID (from Teller Dashboard)
NEXT_PUBLIC_TELLER_APPLICATION_ID=your-application-id

# Teller Environment (for client-side Teller Connect)
# Must match TELLER_ENV below
NEXT_PUBLIC_TELLER_ENV=sandbox

# Teller Webhook Secret (from Teller Dashboard → Webhooks)
TELLER_WEBHOOK_SECRET=your-webhook-secret

# Environment (for server-side API calls)
# Must match NEXT_PUBLIC_TELLER_ENV above
TELLER_ENV=sandbox

# Teller Client Certificate (from teller.zip - cert.pem)
# Required for development/production, optional for sandbox
TELLER_CLIENT_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"

# Teller Client Private Key (from teller.zip - key.pem)
# Required for development/production, optional for sandbox
TELLER_CLIENT_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Note:** The certificate and key are provided in `teller.zip` when you create a Teller project. Copy the entire contents of `cert.pem` and `key.pem` files, including the BEGIN/END lines. Use `\n` for line breaks in environment variables.

### Security Considerations

1. **Access Token Storage:**
   - ✅ **Encrypted** before storage in `source_config` JSONB field
   - Uses AES-256-GCM encryption with a key derived from `ENCRYPTION_KEY`
   - Each encryption uses a unique salt and IV for security
   - Tokens are automatically decrypted when retrieved
   - Legacy plain-text tokens are supported (with warning) for migration

2. **Webhook Signature Verification:**
   - ✅ Implemented HMAC-SHA-256 verification
   - ✅ Timestamp validation (prevents replay attacks)
   - ✅ Uses `TELLER_WEBHOOK_SECRET` from environment

3. **API Authentication:**
   - ✅ **Mutual TLS (mTLS)** required for development/production environments
   - Uses client certificate (`TELLER_CLIENT_CERT`) and private key (`TELLER_CLIENT_KEY`)
   - Certificate and key provided in `teller.zip` when creating Teller project
   - Uses HTTP Basic Auth with access token (in addition to mTLS)
   - Token passed in Authorization header
   - Both certificate AND access token required for API requests
   - Sandbox environment: certificates optional but recommended

### Transaction Conversion

Teller transactions are converted to `ParsedTransaction` format:
- **Amount:** Absolute value of Teller amount
- **Type:** Determined by sign (positive = income, negative = expense)
- **Merchant:** Extracted from `counterparty.name` or description
- **Hash:** Generated for deduplication
- **Date:** ISO 8601 date from Teller

### Webhook Events Handled

- `transactions.processed` - New transactions available
- `transaction.created` - Legacy event (backward compatibility)
- `transaction.updated` - Legacy event (backward compatibility)

### Manual Fetch

Users can manually trigger a fetch:
- Click refresh icon on Teller import setup card
- Calls `/api/automatic-imports/setups/[id]/fetch`
- Fetches all accounts in enrollment
- Queues new transactions

### Testing Checklist

- [ ] Install `teller-connect-react` package ✅
- [ ] Set `NEXT_PUBLIC_TELLER_APPLICATION_ID` in `.env.local`
- [ ] Set `TELLER_WEBHOOK_SECRET` in `.env.local`
- [ ] Test Teller Connect OAuth flow
- [ ] Verify access token storage
- [ ] Test initial transaction fetch
- [ ] Verify transactions appear in queue
- [ ] Test webhook signature verification
- [ ] Test manual fetch functionality
- [ ] Test transaction approval and import

### Known Limitations

1. **Access Token Encryption:** Not yet implemented - tokens stored in plain text
2. **Token Refresh:** Teller access tokens may expire - need refresh flow
3. **Error Handling:** Some edge cases may need better error messages
4. **Multi-Account:** Currently fetches all accounts, but could allow user to select specific accounts

### Next Steps

1. **Encrypt Access Tokens:**
   - Use Supabase Vault or encryption library
   - Decrypt when fetching transactions

2. **Token Refresh:**
   - Implement token refresh flow
   - Handle expired tokens gracefully

3. **Account Selection:**
   - Allow users to select which Teller accounts to import
   - Store selected account IDs in `source_config`

4. **Better Error Handling:**
   - Show user-friendly error messages
   - Handle token expiration
   - Handle disconnected accounts

---

**Status:** ✅ Complete - Ready for Testing  
**Last Updated:** 2025-01-XX

