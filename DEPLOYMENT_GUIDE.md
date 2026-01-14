# Deployment Guide

This guide will walk you through deploying your Founder Leverage Dashboard to production.

## Prerequisites

1. **GitHub Account** (recommended) - Your code should be in a Git repository
2. **Vercel Account** - Free tier is sufficient
3. **Environment Variables** - You'll need these values ready:
   - `SESSION_PASSWORD` - A random string (at least 32 characters) for session encryption
   - `NOTION_API_KEY` - Your Notion integration API key
   - `NOTION_DATABASE_ID` - Your Notion database ID

## Step 1: Prepare Your Code

### 1.1 Generate a Session Password

Generate a secure random string for `SESSION_PASSWORD`. You can use this command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use an online generator: https://randomkeygen.com/

**Save this value** - you'll need it for Vercel.

### 1.2 Commit Your Code to Git

If you haven't already, initialize a Git repository and push to GitHub:

```bash
cd founder-leverage-dashboard
git init
git add .
git commit -m "Initial commit - ready for deployment"
```

Then create a repository on GitHub and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### 2.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account (recommended) or email

### 2.2 Import Your Project

1. Click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Select your GitHub repository
4. Click **"Import"**

### 2.3 Configure Project Settings

Vercel will auto-detect Next.js. Keep these defaults:
- **Framework Preset**: Next.js
- **Root Directory**: `founder-leverage-dashboard` (if your repo is at the root, leave blank)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 2.4 Add Environment Variables

**Before deploying**, click **"Environment Variables"** and add:

1. **SESSION_PASSWORD**
   - Value: The random string you generated in Step 1.1
   - Environment: Production, Preview, Development (select all)

2. **NOTION_API_KEY**
   - Value: Your Notion integration API key
   - Environment: Production, Preview, Development (select all)

3. **NOTION_DATABASE_ID**
   - Value: Your Notion database ID (the long string from your database URL)
   - Environment: Production, Preview, Development (select all)

### 2.5 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build to complete
3. Your site will be live at: `https://your-project-name.vercel.app`

## Step 3: Configure Custom Domain (Optional)

If you want a custom domain (e.g., `assessment.yourdomain.com`):

1. In Vercel dashboard, go to your project → **Settings** → **Domains**
2. Add your domain
3. Follow Vercel's DNS instructions to point your domain to Vercel
4. SSL certificate is automatically provisioned

## Step 4: Verify Deployment

1. Visit your live URL
2. Complete a test assessment
3. Check your Notion database to confirm the lead was created
4. Verify the results page displays correctly

## Troubleshooting

### Build Fails

- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (Vercel uses Node 18+ by default)

### Environment Variables Not Working

- Double-check variable names (case-sensitive)
- Ensure variables are added to the correct environment (Production/Preview/Development)
- Redeploy after adding new variables

### Notion Integration Not Working

- Verify `NOTION_API_KEY` and `NOTION_DATABASE_ID` are correct
- Check that your Notion integration has access to the database
- Review Vercel function logs for error messages

### Session Issues

- Ensure `SESSION_PASSWORD` is at least 32 characters
- In production, sessions require HTTPS (Vercel provides this automatically)

## Post-Deployment Checklist

- [ ] Site loads correctly
- [ ] Assessment form works
- [ ] Results page displays correctly
- [ ] Notion leads are being created
- [ ] All environment variables are set
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic on Vercel)

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Check Vercel dashboard logs for detailed error messages
