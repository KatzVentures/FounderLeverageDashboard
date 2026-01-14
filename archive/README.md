# Archived Functionality

This directory contains AI and authentication functionality that has been removed from the main codebase to simplify the system to self-assessment only.

## Structure

- `ai-functionality/` - All AI-related code including:
  - Claude AI analyzer (`ai-analyzer.ts`)
  - AI team page (`ai-team/`)
  - Processing page (`processing/`)
  - Test pages for Claude integration
  - Scoring engine with AI dependencies (`scoring-engine.ts`)
  - Data API routes for Gmail and Calendar

- `auth-functionality/` - All authentication-related code including:
  - Google OAuth implementation (`google-oauth.ts`)
  - Auth routes (`auth/`)
  - Connect page (`connect/`)
  - Disconnect functionality

## Restoring Functionality

To restore this functionality:
1. Move files back to their original locations
2. Re-add dependencies to `package.json`:
   - `@anthropic-ai/sdk` for Claude AI
   - `googleapis` for Google OAuth
3. Restore session fields in `lib/session.ts`:
   - `googleTokens`
   - `analysisMode`
   - `emailScope`
4. Update routes to handle both `ANSWERS_ONLY` and `DEEP_ANALYSIS` modes
5. Re-enable the `/ai-team` page for mode selection

## Current State

The system now operates in `ANSWERS_ONLY` mode:
- Assessment form → Direct to results
- No authentication required
- No AI analysis
- Results calculated purely from self-assessment answers
