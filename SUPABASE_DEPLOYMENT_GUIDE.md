# 🚀 Supabase Deployment Guide - Complete Implementation

This guide will walk you through deploying your budget app with Supabase authentication and PostgreSQL database.

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- [ ] Supabase account (sign up at https://supabase.com - free tier available)
- [ ] GitHub account (for Vercel deployment)
- [ ] Vercel account (sign up at https://vercel.com - free tier available)
- [ ] Your code pushed to a GitHub repository

---

## 🗄️ Step 1: Set Up Supabase Project

### **1.1 Create Supabase Project**

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in the details:
   - **Name**: `budget-app` (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free tier is fine
4. Click "Create new project"
5. Wait 2-3 minutes for project to be created

### **1.2 Run Database Schema**

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from your project
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is correct!

### **1.3 Get Your API Keys**

1. Go to **Project Settings** (gear icon in left sidebar)
2. Click **API** in the left menu
3. Copy these values (you'll need them soon):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### **1.4 Configure Email Authentication**

1. Go to **Authentication** → **Providers** in left sidebar
2. Make sure **Email** is enabled (it should be by default)
3. Scroll down to **Email Auth** settings
4. **Confirm email**: You can disable this for testing, but enable for production
5. Click "Save"

---

## 🔧 Step 2: Configure Local Environment

### **2.1 Create Environment Variables**

1. In your project root (`budget-app/`), create `.env.local`:

```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here
OPENAI_API_KEY=your-openai-key-here  # Optional, for image import
```

3. Replace the values with your actual Supabase URL and anon key from Step 1.3

### **2.2 Verify Installation**

Check that the Supabase packages are installed:

```bash
npm list @supabase/supabase-js @supabase/ssr
```

You should see both packages listed. If not, run:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

---

## 🧪 Step 3: Test Locally

### **3.1 Start Development Server**

```bash
npm run dev
```

### **3.2 Test Authentication**

1. Open http://localhost:3000
2. You should be redirected to `/login`
3. Click "Sign up" to create an account
4. Enter an email and password (min 6 characters)
5. Click "Create Account"

**If email confirmation is enabled:**
- Check your email for confirmation link
- Click the link to confirm
- Return to login page and sign in

**If email confirmation is disabled:**
- You'll be automatically logged in
- Redirected to dashboard

### **3.3 Verify Data Isolation**

1. Sign up with a second email (use incognito/private window)
2. Create some categories in the second account
3. Log out and log back in with first account
4. Verify you only see your own data

---

## 🚀 Step 4: Deploy to Vercel

### **4.1 Push Code to GitHub**

If you haven't already:

```bash
git add .
git commit -m "Add Supabase authentication and deployment"
git push origin main
```

### **4.2 Deploy to Vercel**

1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `budget-app`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### **4.3 Add Environment Variables**

In the Vercel project settings, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here
OPENAI_API_KEY=your-openai-key-here  # Optional
```

### **4.4 Deploy**

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: `https://your-app.vercel.app`

### **4.5 Configure Supabase Redirect URLs**

1. Go back to your Supabase project
2. Go to **Authentication** → **URL Configuration**
3. Add your Vercel URL to **Redirect URLs**:
   ```
   https://your-app.vercel.app/auth/callback
   ```
4. Add to **Site URL**:
   ```
   https://your-app.vercel.app
   ```
5. Click "Save"

---

## ✅ Step 5: Verify Deployment

### **5.1 Test Production App**

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. You should see the login page
3. Sign up with a new account (or use existing)
4. Verify all features work:
   - [ ] Login/Signup
   - [ ] Create categories
   - [ ] Add transactions
   - [ ] Import CSV
   - [ ] Reports
   - [ ] Logout

### **5.2 Test Data Isolation**

1. Create some data in your account
2. Log out
3. Sign up with a different email
4. Verify you don't see the first account's data

---

## 🔒 Security Checklist

Before sharing your app, verify:

- [ ] All pages require authentication (try accessing `/` without login)
- [ ] Users can only see their own data
- [ ] HTTPS is enabled (Vercel does this automatically)
- [ ] Environment variables are set in Vercel (not in code)
- [ ] Email confirmation is enabled in Supabase (for production)
- [ ] Strong password requirements (min 6 characters)
- [ ] No API keys or secrets in GitHub repository

---

## 🎯 What's Been Implemented

### **✅ Authentication**
- Email/password signup and login
- Session management with secure cookies
- Protected routes (middleware)
- Logout functionality

### **✅ Database**
- PostgreSQL database (Supabase)
- Row Level Security (RLS) policies
- User data isolation
- All tables have `user_id` foreign keys

### **✅ Security**
- HTTPS/SSL (automatic with Vercel)
- Environment variables encrypted
- Database credentials never exposed
- API routes protected
- Row-level data isolation

### **✅ Infrastructure**
- Serverless deployment (Vercel)
- Auto-scaling
- Global CDN
- Automatic backups (Supabase)

---

## 💰 Cost

**Free Tier Limits:**

**Vercel:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic SSL
- **Cost: $0/month**

**Supabase:**
- 500MB database
- 50,000 monthly active users
- Unlimited API requests
- Daily backups
- **Cost: $0/month**

**Total: $0/month** for personal use! 🎉

---

## 🐛 Troubleshooting

### **"Invalid login credentials"**
- Make sure you confirmed your email (check spam folder)
- Try resetting password in Supabase dashboard

### **"Failed to fetch" errors**
- Check environment variables are set correctly
- Verify Supabase URL and anon key
- Check browser console for CORS errors

### **Redirected to login after signing up**
- Email confirmation might be enabled
- Check your email for confirmation link
- Or disable email confirmation in Supabase settings

### **Can see other users' data**
- RLS policies might not be enabled
- Re-run the `supabase-schema.sql` script
- Check Supabase logs for policy errors

### **Build fails on Vercel**
- Check build logs for errors
- Verify all dependencies are in `package.json`
- Make sure `budget-app` is set as root directory

---

## 📚 Next Steps

Now that your app is deployed:

1. **Custom Domain** (optional)
   - Add your own domain in Vercel settings
   - Update Supabase redirect URLs

2. **Email Templates** (optional)
   - Customize email templates in Supabase
   - Add your branding

3. **Monitoring**
   - Check Vercel analytics
   - Monitor Supabase usage

4. **Backups**
   - Supabase does daily backups automatically
   - Consider exporting data periodically

---

## 🎉 You're Done!

Your budget app is now:
- ✅ Securely deployed to the web
- ✅ Protected with authentication
- ✅ Isolated per user
- ✅ Backed up automatically
- ✅ Scalable and fast

Share your app URL with confidence! 🚀

