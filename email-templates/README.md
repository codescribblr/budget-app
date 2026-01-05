# Email Templates for Supabase Auth

This directory contains branded email templates for Supabase authentication emails.

## How to Apply Templates

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com/project/nmqlddimigebtlaophbv/auth/templates

2. Click on the **"Confirm signup"** template

3. Copy the contents of `confirmation.html` and paste it into the **"Message Body (HTML)"** field

4. Update the **Subject** to: `Confirm your email - Budget App`

5. Click **Save** to apply the changes

6. Repeat for other templates as needed:
   - **Magic Link**: Use for passwordless login
   - **Reset Password**: Use for password recovery
   - **Invite User**: Use for team invitations
   - **Change Email**: Use for email change confirmations

### Option 2: Via Supabase Management API

You can also update templates programmatically using the Supabase Management API:

```bash
# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="nmqlddimigebtlaophbv"

# Read the HTML template
TEMPLATE_CONTENT=$(cat confirmation.html | jq -Rs .)

# Update the confirmation email template
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"mailer_subjects_confirmation\": \"Confirm your email - Budget App\",
    \"mailer_templates_confirmation_content\": $TEMPLATE_CONTENT
  }"
```

## Template Variables

The following variables are available in Supabase email templates:

- `{{ .ConfirmationURL }}` - The confirmation link for the user to click
- `{{ .Token }}` - A 6-digit OTP code (alternative to confirmation URL)
- `{{ .TokenHash }}` - Hashed version of the token
- `{{ .Email }}` - The user's email address
- `{{ .SiteURL }}` - Your application's site URL (configured in Supabase)
- `{{ .RedirectTo }}` - The redirect URL passed during signup
- `{{ .Data }}` - User metadata from `auth.users.user_metadata`

## Testing

After applying the template:

1. Create a test account with a new email address
2. Check your inbox for the confirmation email
3. Verify that:
   - The email displays correctly in your email client
   - The branding matches your app
   - The confirmation link works
   - The email is mobile-responsive

## Customization

To customize the templates:

1. Edit the HTML files in this directory
2. Update colors to match your brand:
   - Primary color: `#0f172a` (dark slate)
   - Accent color: `#3b82f6` (blue)
   - Background: `#f8fafc` (light gray)
3. Replace the SVG logo with your own logo image
4. Apply the updated template via the dashboard or API

## Additional Templates

You can create similar branded templates for:

- `magic-link.html` - Passwordless login
- `reset-password.html` - Password recovery
- `invite-user.html` - Team invitations
- `change-email.html` - Email change confirmations

All templates should follow the same design system for consistency.


