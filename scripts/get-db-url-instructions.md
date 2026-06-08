# How to Get Your Supabase Database URL

## Step-by-Step Instructions:

### 1. Go to Your Supabase Dashboard
Open your browser and go to: https://supabase.com/dashboard

### 2. Select Your Project
Click on your budget app project

### 3. Navigate to Database Settings
- Click on the **Settings** icon (⚙️) in the left sidebar
- Click on **Database**

### 4. Find the Connection String
Scroll down to the **Connection string** section

You'll see two options:
- **Connection pooling** (Use this one! ✅)
- Connection parameters

### 5. Copy the Connection Pooling URL
Click on the **Connection pooling** tab and you'll see a URL that looks like:

```
postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

Or it might look like:

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

### 6. Replace [YOUR-PASSWORD]
The URL will have `[YOUR-PASSWORD]` in it. You need to replace this with your actual database password.

**Important:** This is the password you set when you created your Supabase project, NOT your Supabase account password.

### 7. If You Don't Remember Your Database Password
If you forgot your database password:
1. On the same Database settings page
2. Scroll down to **Database password**
3. Click **Reset database password**
4. Copy the new password
5. Use it in your connection string

## Example:

**Before (what you copy):**
```
postgresql://postgres.abcdefghijk:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**After (with your password):**
```
postgresql://postgres.abcdefghijk:MySecurePassword123@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

## Security Note:
⚠️ **Never commit this URL to git or share it publicly!** It contains your database password.


