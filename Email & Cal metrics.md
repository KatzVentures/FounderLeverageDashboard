# Calculation Explanations

This document explains how each metric is calculated so you can verify accuracy and suggest improvements.

## 1. Delegatable Email Coordination (18 hours/month)

**Formula:** `calculateEmailCost(delegatableCount, weeklyVolume)`

**What qualifies as "delegatable"?**

Claude AI analyzes each email thread and categorizes it. An email is counted as "delegatable" if it matches ANY of these criteria (with confidence ≥ 0.7):

**Delegatable Categories:**
1. **DELEGATABLE_OPERATIONAL** - Routine operational tasks that can be handled by team/VA
   - Examples: Support requests, routine inquiries, standard processes, vendor communications
   
2. **TEAM_COORDINATION** - Internal team coordination and communication
   - Examples: Project updates, team syncs, workflow coordination, internal planning
   
3. **FIREFIGHTING** - Urgent/problem-solving emails that interrupt flow
   - Examples: Escalations, urgent issues, crisis management (team should handle these)

**NOT Delegatable (excluded):**
- **STRATEGIC_INPUT** - Requires CEO-level strategic thinking (CEO-only work)
- **EXTERNAL_CRITICAL** - Important external communications requiring CEO attention
- **PERSONAL_IGNORE** - Personal life emails (filtered out completely)

**Additional signals:**
- If Claude's `suggestedAction` includes "delegate" → counted as delegatable
- Backward compatibility: Category names containing "support", "coordination", or "operational" → counted as delegatable

**Calculation Breakdown:**
- **60% of delegatable emails require responses** (5 minutes each)
- **100% of delegatable emails need reading** (2 minutes each)
- **Weekly calculation:** `(delegatableCount * 0.6 * 5) + (delegatableCount * 2)` minutes
- **Monthly conversion:** `weeklyMinutes / 60 * 4.3 weeks`
- **Cost:** `monthlyHours * $250/hr`

**Example with 53 delegatable emails:**
- Response time: `53 * 0.6 * 5 = 159 minutes`
- Read time: `53 * 2 = 106 minutes`
- Total weekly: `265 minutes = 4.42 hours`
- Monthly: `4.42 * 4.3 = 19 hours/month`
- Cost: `19 * $250 = $4,750/month`

## 2. Meeting Overhead ($176,200/month)

**Formula:** `calculateMeetingCost(weeklyMeetings, weeklyHours)`

**Current assumptions:**
- **Prep time:** 10 minutes per meeting
- **Context switching:** 0 minutes per meeting (disabled)
- **Follow-up:** 5 minutes per meeting
- **Total overhead:** 15 minutes per meeting (`10 + 0 + 5`)

**Calculation:**
- **Actual meeting hours:** `weeklyHours` (from calendar)
- **Prep time:** `weeklyMeetings * 10 minutes`
- **Context switching:** `weeklyMeetings * 0 minutes` (disabled)
- **Follow-up:** `weeklyMeetings * 5 minutes`
- **True weekly hours:** `(weeklyHours * 60) + prep + switching + followup` minutes / 60
- **Monthly:** `weeklyTrueHours * 4.3 weeks`
- **Cost:** `monthlyHours * $250/hr`

**Example with 100 meetings/week, 122 hours/week:**
- Actual: `122 hours`
- Prep: `100 * 10 = 1,000 minutes = 16.7 hours`
- Switching: `100 * 0 = 0 hours` (disabled)
- Follow-up: `100 * 5 = 500 minutes = 8.3 hours`
- True weekly: `122 + 16.7 + 0 + 8.3 = 147 hours`
- Monthly: `147 * 4.3 = 632 hours/month`
- Cost: `632 * $250 = $158,000/month`

## 3. Decisions Pending (0 decisions, 8 hour avg wait)

**Formula:** `calculateThreadsAwaitingResponse(threads, userEmail)`

**Calculation:**
- Counts email threads where the **last message is INBOUND** (not from user)
- Filters out `PERSONAL_IGNORE` threads
- **Average wait time** is currently hardcoded to 8 hours (placeholder)

**Current status:** The calculation is working but showing 0, which might mean:
- All threads have been responded to
- Or the calculation needs adjustment

## 4. Meeting Prep Time

**Current:** 5 minutes per meeting
- **Prep time:** 5 minutes
- **Follow-up:** 5 minutes
- **Context switching:** 0 minutes (disabled)
- **Total overhead:** 10 minutes per meeting
