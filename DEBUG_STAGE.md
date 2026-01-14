# Debugging Stage Calculation Issue

## Problem
Score of 72 is showing "Elite Operator" instead of "Stretched Leader"

## Debugging Steps

1. **Open browser console** (F12 or Cmd+Option+I)
2. **Look for these log messages:**
   - `[STAGE DEBUG] ===== STAGE CALCULATION START =====`
   - `[STAGE DEBUG] Extracted score: 72`
   - `[STAGE DEBUG] Calculated stage:` (should show Stretched Leader)
   - `[STAGE RENDER] Rendering stage for score 72 : Stretched Leader`

3. **Check what the logs show:**
   - What is the actual score value?
   - What stage is being calculated?
   - What stage is being rendered?

4. **If still showing Elite Operator:**
   - Check if there's a cached value in sessionStorage
   - Clear browser cache completely
   - Check if results.score is actually 72

## Expected Behavior
- Score 72 → Stage: "Stretched Leader" (🎯)
- Score 90+ → Stage: "Elite Operator" (🚀)

## Files to Check
- `app/results/page.tsx` - Stage calculation
- `lib/stages.ts` - Stage definitions
- Browser console logs
