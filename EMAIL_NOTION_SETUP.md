# Email & Notion Integration Setup

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install resend @notionhq/client
   ```

2. **Set up environment variables** (create `.env.local` file):
   ```env
   # Session Security
   SESSION_PASSWORD=your-secret-session-password-here-minimum-32-characters

   # Email Service (Resend)
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL=Founder Leverage <results@your-domain.com>

   # Booking Link
   BOOKING_LINK=https://calendly.com/your-link

   # Notion CRM Integration
   NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
   NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # App URL (for email links)
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

## Email Setup (Resend)

1. **Sign up for Resend:**
   - Go to https://resend.com
   - Create an account
   - Verify your domain (or use their test domain for development)

2. **Get your API key:**
   - Go to https://resend.com/api-keys
   - Create a new API key
   - Copy it to `RESEND_API_KEY` in your `.env.local`

3. **Set your from email:**
   - Use a verified domain email: `Founder Leverage <results@your-domain.com>`
   - Or use Resend's test domain for development: `onboarding@resend.dev`

4. **Set your booking link:**
   - Add your Calendly or booking link to `BOOKING_LINK`

## Notion CRM Setup

See `NOTION_SETUP.md` for detailed instructions.

**Quick version:**
1. Create a Notion integration at https://www.notion.so/my-integrations
2. Create a database with properties: Email, Name, Score, Stage, Revenue Range, Status, Source, Created
3. Share the database with your integration
4. Copy the database ID from the URL
5. Add `NOTION_API_KEY` and `NOTION_DATABASE_ID` to your `.env.local`

## How It Works

When a user completes the assessment:

1. **Results are calculated** and saved to session
2. **Email is sent** to the user with:
   - Their score and stage
   - Stage description
   - Booking link for next steps
   - Link to view detailed results

3. **Notion lead is created** with:
   - Email address
   - Score
   - Stage (with emoji)
   - Revenue range
   - Source: "Self-Assessment"
   - Status: "New Lead"
   - Created date

Both email and Notion operations are **non-blocking** - if they fail, the assessment still completes successfully (errors are logged).

## Customization

### Email Template
Edit `lib/email.ts` to customize the email design and content.

### Notion Properties
Edit `lib/notion.ts` to match your Notion database property names exactly (they're case-sensitive).

### Booking Link
Set `BOOKING_LINK` in your environment variables, or it will default to the value in the code.

## Testing

1. Complete an assessment with a valid email
2. Check your email inbox for the results email
3. Check your Notion database for the new lead entry

## Troubleshooting

- **Email not sending**: Check Resend dashboard for errors, verify API key and from email
- **Notion lead not creating**: Check that database is shared with integration and property names match exactly
- **Both failing silently**: Check server logs for error messages (they're logged but don't block the assessment)
