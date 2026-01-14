# Notion CRM Setup Guide

This guide will help you connect your assessment form to your Notion "Clients" database.

## Step 1: Create a Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "New integration" (top right)
3. Fill in:
   - **Name:** `Founder Leverage CRM` (or any name)
   - **Associated workspace:** Select your workspace
4. Click "Submit"
5. **Copy the "Internal Integration Token"** (starts with `secret_`) - this is your `NOTION_API_KEY`
6. Add this to your `.env.local` file as `NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx`

## Step 2: Share Your Database with Integration

1. Open your Notion "Clients" database
2. Click the "..." menu in the top right of the database
3. Click "Connections" or "Add connections"
4. Find your integration (`Founder Leverage CRM`) and click it
5. The database is now connected to your integration

## Step 3: Get Your Database ID

1. Open your Notion "Clients" database
2. Look at the URL in your browser
3. The URL looks like: `https://www.notion.so/workspace/DATABASE_ID?v=...`
4. Copy the `DATABASE_ID` (it's a 32-character string, alphanumeric)
   - It's the part between the last `/` and the `?` or `#`
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
5. Add this to your `.env.local` file as `NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 4: Verify Your Database Properties

Your Notion "Clients" database should have these exact properties (case-sensitive):

- **Company Name** (type: Title) - Required
- **Status** (type: Select) - Required
  - Options: `Lead`, `Prospect`, `Pending Decision`, etc.
  - **Default value:** `Lead` (automatically set for new assessments)
- **Email Address** (type: Email) - Required
- **Current annual revenue** (type: Select) - Required
  - Options: `Over $5 million`, `$1 - $5 million`, `NA`

**Important:** The property names must match exactly (case-sensitive):
- `Company Name` (not "company name" or "Company name")
- `Status` (not "status")
- `Email Address` (not "Email" or "email address")
- `Current annual revenue` (exact match including spaces)

## Step 5: Update Form Revenue Options

Your assessment form revenue options must match your Notion database select options exactly. Currently, your form has more options than your Notion database. You should update the form to only include:

- `Over $5 million`
- `$1 - $5 million`
- `NA`

Or update your Notion database to include all the form options.

## Step 6: Test the Integration

1. Restart your dev server after adding environment variables:
   ```bash
   npm run dev
   ```

2. Complete a test assessment:
   - Fill out all questions
   - Enter name, email, and select a revenue range
   - Submit the assessment

3. Verify in Notion:
   - Open your "Clients" database
   - Look for a new row with:
     - **Company Name:** The name you entered
     - **Status:** `Lead` (yellow tag)
     - **Email Address:** The email you entered
     - **Current annual revenue:** The option you selected

## Troubleshooting

### "object_not_found" Error
- Make sure you've shared the database with your integration (Step 2)
- Verify `NOTION_DATABASE_ID` is correct

### "validation_error" Error
- Check that property names match exactly (case-sensitive)
- Verify the revenue option you selected exists in your Notion database
- Check server logs for detailed error messages

### Lead Not Appearing in Notion
- Check server logs for `[NOTION]` messages
- Verify both `NOTION_API_KEY` and `NOTION_DATABASE_ID` are set in `.env.local`
- Make sure you restarted the dev server after adding environment variables

## Helper: View Your Database Schema

You can verify your database properties by running this in your code:

```typescript
import { getNotionDatabaseSchema } from '@/lib/notion';
getNotionDatabaseSchema();
```

This will log your database properties so you can verify they match the code.

---

**What Gets Created:**
Every time someone completes the assessment, a new lead is automatically created in your Notion "Clients" database with:
- **Company Name:** The name they entered
- **Status:** `Lead` (automatically set)
- **Email Address:** Their email
- **Current annual revenue:** The revenue range they selected
