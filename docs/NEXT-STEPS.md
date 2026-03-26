# MedPanel AI — Next Steps (March 26, 2026)

## Immediate TODO (dual-mode results page)

### What needs building:
1. **Mode toggle component** — `[Patient View]` / `[Clinician View]` segmented control at top of results page
2. **Dual data objects** — patient-language and clinician-language versions of every section:
   - Safety flags: "Your cholesterol needs attention" vs "Atherogenic dyslipidemia: LDL 151, HDL 36"
   - Consensus: plain English vs clinical with GRADE
   - Primary output: "Questions to Ask Your Doctor" vs "Points to Explore With Your Patient"
   - Questions: simplified vs clinical with guideline refs
3. **Landing page** — soft audience split: "I'm a doctor" / "I'm a patient" adjusts hero copy
4. **Appointment Prep** concept in patient view — the killer patient feature

### Files to modify:
- `app/consult/[id]/page.tsx` — add mode toggle + dual rendering
- `app/page.tsx` — audience split on landing
- `src/components/mode-toggle.tsx` — new component

### Architecture decision made:
- Doctor-first AND patient mode, built simultaneously
- Toggle on results page for v1 (no auth needed)
- With auth later: role saved to profile, auto-applies

## Current project state:
- Landing page: live, doctor-focused, with product preview mockup showing specialist debate
- Consultation input: live, hardcoded profile
- Results page: live, hardcoded CoQ10 data, single mode (mixed patient/doctor language)
- Dev server: `npm run dev` at localhost:3000
- All files in `~/Documents/DiscussionAgents/`
- App directory at root level (`app/`) not `src/app/`

## To continue in a new session:
Read `~/.claude/projects/-Users-tradeaspire/memory/medpanel-handoff.md` for full project context.
Then read this file for immediate TODO.
