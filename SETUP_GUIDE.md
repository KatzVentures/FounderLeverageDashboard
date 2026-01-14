# Complete Setup Guide: Email & Notion Integration

Follow these steps exactly to get email sending and Notion CRM integration working.

## Prerequisites

✅ Packages are already installed (`resend` and `@notionhq/client`)

---

## Part 1: Email Setup (Resend)

### Step 1: Create Resend Account
1. Go to https://resend.com
2. Click "Sign Up" and create an account
3. Verify your email address

### Step 2: Get Your API Key
1. Once logged in, go to https://resend.com/api-keys
2. Click "Create API Key"
3. Give it a name (e.g., "Founder Leverage Dashboard")
4. Click "Create"
5. **Copy the API key** (starts with `re_`) - you won't see it again!

### Step 3: Verify Your Domain (or use test domain)
**Option A: Use Resend's Test Domain (Quick Setup)**
- For development/testing, you can use: `onboarding@resend.dev`
- No domain verification needed
- Limited to 100 emails/day

**Option B: Verify Your Own Domain (Production)**
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain: `results.katzventures.co`
4. Follow the DNS setup instructions
5. Add the DNS records to your domain provider (wherever `katzventures.co` DNS is managed)
6. Wait for verification (usually a few minutes)

### Step 4: Set Your From Email
- **Your domain:** `Founder Leverage <results@results.katzventures.co>`
- **For testing (if domain not verified yet):** `Founder Leverage <onboarding@resend.dev>`

---

## Part 2: Notion CRM Setup

### Step 1: Create Notion Integration
1. Go to https://www.notion.so/my-integrations
2. Click "New integration" (top right)
3. Fill in:
   - **Name:** `Founder Leverage CRM` (or any name)
   - **Logo:** (optional)
   - **Associated workspace:** Select your workspace
4. Click "Submit"
5. **Copy the "Internal Integration Token"** (starts with `secret_`) - this is your API key

### Step 2: Share Database with Integration
1. Open your Notion database (the one with Company Name, Status, Email Address, Current annual revenue)
2. Click the "..." menu in the top right of the database
3. Click "Connections" or "Add connections"
4. Find your integration (`Founder Leverage CRM`) and click it
5. The database is now connected to your integration

### Step 3: Get Your Database ID
1. Open your Notion database
2. Look at the URL in your browser
3. The URL looks like: `https://www.notion.so/workspace/DATABASE_ID?v=...`
4. Copy the `DATABASE_ID` (it's a 32-character string, alphanumeric)
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
   - It's the part between the last `/` and the `?` or `#`

---

## Part 3: Environment Variables Setup

### Step 1: Create `.env.local` File
1. In your project root (`founder-leverage-dashboard`), create a file named `.env.local`
2. If the file already exists, open it

### Step 2: Add All Required Variables
Copy and paste this into `.env.local`, then fill in your actual values:

```env
# Session Security (required for app to work)
SESSION_PASSWORD=your-secret-session-password-here-minimum-32-characters-long

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Founder Leverage <results@results.katzventures.co>

# Booking Link (your Calendly or booking page)
BOOKING_LINK=https://calendly.com/your-link

# Notion CRM Integration
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App URL (for email links back to results page)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# For production, change to:
# NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 3: Fill In Your Values
Replace each placeholder with your actual values:

- `SESSION_PASSWORD`: Generate a random 32+ character string (you can use: `openssl rand -base64 32` in terminal)
- `RESEND_API_KEY`: Paste the API key from Resend (starts with `re_`)
- `RESEND_FROM_EMAIL`: Use the email format shown above
- `BOOKING_LINK`: Your actual Calendly or booking page URL
- `NOTION_API_KEY`: Paste the integration token from Notion (starts with `secret_`)
- `NOTION_DATABASE_ID`: Paste the database ID from the Notion URL
- `NEXT_PUBLIC_APP_URL`: Use `http://localhost:3000` for local development

---

## Part 4: Test the Integration

### Step 1: Restart Your Dev Server
1. Stop your current dev server (Ctrl+C)
2. Start it again: `npm run dev`
3. This loads the new environment variables

### Step 2: Complete a Test Assessment
1. Go to http://localhost:3000
2. Click "Start Assessment"
3. Fill out all questions
4. On the final step, enter:
   - **Name:** Test User
   - **Email:** Your real email (to test receiving)
   - **Revenue Range:** Select any option
5. Click "Submit Assessment"

### Step 3: Verify Email Was Sent
1. Check your email inbox (and spam folder)
2. You should receive an email with:
   - Your score
   - Your stage (e.g., "Stretched Leader")
   - Booking link
   - Link to detailed results

### Step 4: Verify Notion Lead Was Created
1. Open your Notion database
2. Look for a new row with:
   - **Company Name:** "Test User" (or whatever name you entered)
   - **Status:** "Lead" (brown tag)
   - **Email Address:** The email you entered
   - **Current annual revenue:** The option you selected

---

## Troubleshooting

### Email Not Sending?
1. **Check Resend dashboard:** https://resend.com/emails
   - Look for failed sends and error messages
2. **Verify API key:** Make sure `RESEND_API_KEY` in `.env.local` is correct
3. **Check from email:** Must match verified domain or use `onboarding@resend.dev`
4. **Check server logs:** Look for `[EMAIL]` messages in your terminal

### Notion Lead Not Creating?
1. **Check database sharing:** Make sure you shared the database with your integration
2. **Verify API key:** Make sure `NOTION_API_KEY` in `.env.local` is correct
3. **Verify database ID:** Make sure `NOTION_DATABASE_ID` matches your database URL
4. **Check property names:** They must match exactly (case-sensitive):
   - `Company Name` (not "company name" or "Company name")
   - `Status` (not "status")
   - `Email Address` (not "Email" or "email address")
   - `Current annual revenue` (exact match including spaces)
5. **Check server logs:** Look for `[NOTION]` messages in your terminal

### Both Failing?
- Check that `.env.local` file exists in the `founder-leverage-dashboard` directory
- Make sure you restarted the dev server after adding environment variables
- Check terminal for error messages starting with `[EMAIL]` or `[NOTION]`

---

## Production Deployment

When deploying to production (Vercel, etc.):

1. **Add environment variables in your hosting platform:**
   - Vercel: Go to Project Settings → Environment Variables
   - Add all the same variables from `.env.local`

2. **Update `NEXT_PUBLIC_APP_URL`:**
   - Change to your production domain: `https://your-domain.com`

3. **Verify Resend domain:**
   - Make sure you've verified your domain in Resend
   - Update `RESEND_FROM_EMAIL` to use your verified domain

4. **Test in production:**
   - Complete a test assessment
   - Verify email is received
   - Verify Notion lead is created

---

## Quick Reference

**Resend:**
- Dashboard: https://resend.com
- API Keys: https://resend.com/api-keys
- Domains: https://resend.com/domains
- Email Logs: https://resend.com/emails

**Notion:**
- Integrations: https://www.notion.so/my-integrations
- Your database URL contains the database ID

**Environment Variables Needed:**
- `SESSION_PASSWORD` (32+ chars)
- `RESEND_API_KEY` (starts with `re_`)
- `RESEND_FROM_EMAIL` (email format)
- `BOOKING_LINK` (your booking URL)
- `NOTION_API_KEY` (starts with `secret_`)
- `NOTION_DATABASE_ID` (32-char string)
- `NEXT_PUBLIC_APP_URL` (your app URL)

---

That's it! Once you complete these steps, every assessment submission will automatically:
1. ✅ Send an email to the user with their results and booking link
2. ✅ Create a lead in your Notion database with Status = "Lead"
