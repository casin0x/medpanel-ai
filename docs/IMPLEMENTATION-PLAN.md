# MedPanel AI — Full Implementation Plan

## Overview

42 tasks across 7 phases. Each phase builds on the previous.
Estimated: 8-12 focused sessions to complete all phases.

---

## Phase 1: Core Pipeline (Ship MVP)
**Goal:** Real AI consultations running end-to-end
**Sessions needed:** 2-3

### 1.1 Orchestrator Engine
- [ ] Build `src/lib/orchestrator.ts` — main pipeline coordinator
- [ ] Implement question → classifier → specialist routing
- [ ] Connect Claude Opus for specialists, Haiku for classifier
- [ ] Wire PubMed API for evidence retrieval
- [ ] Implement round-by-round discussion protocol (Round 1: independent, Round 2: cross-examination, Round 3: synthesis)
- [ ] Build moderator synthesis step
- [ ] Output matches `schemas/agent-output.json` and `schemas/synthesis-output.json`

### 1.2 API Routes
- [ ] `app/api/consult/route.ts` — POST to start consultation
- [ ] `app/api/consult/[id]/route.ts` — GET consultation status/results
- [ ] `app/api/consult/[id]/stream/route.ts` — SSE for real-time progress
- [ ] Rate limiting + API key validation

### 1.3 Database Wiring
- [ ] Connect Supabase client (`src/lib/supabase.ts`)
- [ ] Auth (Supabase Auth with email/magic link)
- [ ] Save consultations to DB
- [ ] Load consultation results from DB for results page

### 1.4 Wire UI to Real Data
- [ ] Consultation input page → calls real API (not demo redirect)
- [ ] Results page → loads from DB (not hardcoded DEMO object)
- [ ] Real-time progress page with SSE (specialist cards filling in live)

**Deliverable:** A user can type a question, see specialists analyze it in real-time, and get a real structured result.

---

## Phase 2: Swedish Locale + Doctor Features
**Goal:** Swedish doctors can use MedPanel in Swedish
**Sessions needed:** 1-2

### 2.1 Swedish Language Support
- [ ] Add `locale` field to patient profile schema
- [ ] Add Swedish output instructions to each specialist prompt
- [ ] Build locale toggle in UI (Swedish/English)
- [ ] Swedish medical terminology mapping (key terms: blodtryck, njursvikt, leverfunktion, etc.)
- [ ] ICD-10-SE code support in classifier

### 2.2 FASS Integration
- [ ] Research FASS API access (api.fass.se) — contact LIF for terms
- [ ] Build `src/lib/evidence/fass.ts` client
- [ ] Route drug lookups through FASS when locale=sv, DrugBank otherwise
- [ ] Map ATC codes to specialist prompts

### 2.3 Janusmed Integration
- [ ] Build `src/lib/evidence/janusmed.ts` client
- [ ] Integrate Janusmed Interactions API (free for healthcare)
- [ ] Integrate Janusmed Renal Function for dose adjustments
- [ ] Feed Janusmed results into pharmacologist agent context

### 2.4 Remiss (Referral Letter) Generation
- [ ] Build remiss output template following Swedish standard format
- [ ] Add "Generate Remiss" button on results page (clinician mode)
- [ ] Output: patient summary, relevant findings, specialist questions, evidence
- [ ] Copy-to-clipboard for pasting into EHR

**Deliverable:** Swedish doctor can run a consultation in Swedish, see Janusmed interactions, and generate a referral letter.

---

## Phase 3: Trust & UX Improvements
**Goal:** Match what research says doctors need
**Sessions needed:** 1-2

### 3.1 Source Verification (3-Second Rule)
- [ ] Make every PubMed citation clickable → opens quote in side panel
- [ ] Show exact relevant passage from the paper, not just the link
- [ ] Add "Evidence Confidence" indicator per claim

### 3.2 Summary-First Output
- [ ] Add collapsible TL;DR at top of results (3-5 bullet points)
- [ ] Expandable detail sections (click to see full specialist reasoning)
- [ ] Default: collapsed. Clinician can drill down.

### 3.3 Copy to Clinical Note
- [ ] "Copy to Note" button — generates structured plain text
- [ ] Format: suitable for pasting into Epic, COSMIC, or any EHR text field
- [ ] Includes: key findings, consensus, safety flags, evidence citations

### 3.4 Inverted Questions
- [ ] When in clinician mode, output "Questions to ask [specialist]"
- [ ] GP referring to nephrologist gets "Questions to ask the nephrologist about this patient"
- [ ] Maps to the remiss generation flow

### 3.5 Swedish Lab Ranges
- [ ] Build NORIP reference range database (key labs: creatinine, ALAT, bilirubin, Hb, trombocyter, etc.)
- [ ] When locale=sv, interpret labs against Nordic ranges
- [ ] Flag discrepancies between US and Nordic interpretation

**Deliverable:** Doctors trust the output, can verify in 3 seconds, and can paste into their EHR.

---

## Phase 4: Payments + Auth
**Goal:** People can pay
**Sessions needed:** 1

### 4.1 Stripe Integration
- [ ] Stripe Checkout for per-consultation ($5-15) and subscription ($19/mo)
- [ ] Swedish pricing: 49-149 SEK per consult, 395 SEK/month
- [ ] Free tier: 3 consultations/month
- [ ] Webhook for payment confirmation → unlock consultation

### 4.2 User Profiles
- [ ] Patient profile management page (already designed, needs wiring)
- [ ] Save/load patient profile from Supabase
- [ ] Consultation history page with past results

**Deliverable:** MedPanel accepts payment and has user accounts.

---

## Phase 5: Video v3 + Marketing Assets
**Goal:** Doctor-ready video and conference materials
**Sessions needed:** 1-2

### 5.1 Video Restructure (Based on Research)
- [ ] Scene 1: Clinical scenario cold open (berberine/eGFR patient)
- [ ] Scene 2: "What if you could convene a case conference in 90 seconds?"
- [ ] Scene 3: Show specialists analyzing + cross-examining (the unique thing)
- [ ] Scene 4: Consensus — where they agree (with vote badges)
- [ ] Scene 5: Disagreement — where they clash (the money shot)
- [ ] Scene 6: Questions for your doctor (the primary output)
- [ ] Scene 7: Dual mode (patient ↔ clinician)
- [ ] Scene 8: Evidence citations with PMIDs
- [ ] Scene 9: CTA with credibility markers

### 5.2 Video Cuts
- [ ] 73-second full version (website, email)
- [ ] 30-second hook cut (social media, conference screens)
- [ ] Swedish subtitle version

### 5.3 Conference Assets
- [ ] Poster PDF for Vitalis booth
- [ ] QR code → live demo flow
- [ ] One-pager PDF (investor/doctor dual-purpose)

**Deliverable:** Three video cuts + conference materials ready for Vitalis 2026.

---

## Phase 6: Pilot + Traction
**Goal:** 50+ doctor users, testimonials
**Sessions needed:** 1 (setup, then ongoing manual work)

### 6.1 Doctor Outreach Infrastructure
- [ ] Set up email forwarding (invest@medpanel.ai, hello@medpanel.ai)
- [ ] Build waitlist/early access page
- [ ] Doximity profile/presence for US doctors
- [ ] LinkedIn content strategy (2 posts/week)

### 6.2 Swedish Pilot
- [ ] Identify 5-10 Swedish GPs (SFAM network, personal connections)
- [ ] Provide free access for 3 months
- [ ] Collect structured feedback + testimonials
- [ ] Track: consultations/week, time saved, referral quality

### 6.3 Conference Application
- [ ] Apply for Vitalis 2026 (May 4-7, Gothenburg) — exhibitor or startup track
- [ ] Prepare demo flow for booth

**Deliverable:** Real doctors using MedPanel, testimonial clips, Vitalis application submitted.

---

## Phase 7: Sale Preparation
**Goal:** Ready for buyer conversations
**Sessions needed:** 1

### 7.1 IP Protection
- [ ] File provisional patent (cross-examination protocol)
- [ ] Document all IP: protocol spec, prompts, schemas, codebase

### 7.2 Buyer Package
- [ ] Technical documentation package (architecture, API docs, data flow)
- [ ] User metrics dashboard (consultations, retention, NPS)
- [ ] Financial model (unit economics, projections)
- [ ] Update investor page with traction data

### 7.3 Outreach
- [ ] M&A broker engagement (retainer + success fee)
- [ ] Direct outreach to 5-10 buyer contacts
- [ ] Prepare 30-minute demo walkthrough

**Deliverable:** Complete buyer package, broker engaged, conversations started.

---

## Session Estimates

| Phase | Sessions | Calendar Time |
|-------|----------|---------------|
| 1. Core Pipeline | 2-3 | Weeks 1-3 |
| 2. Swedish Locale | 1-2 | Weeks 3-4 |
| 3. Trust & UX | 1-2 | Weeks 4-5 |
| 4. Payments | 1 | Week 5 |
| 5. Video v3 | 1-2 | Week 6 |
| 6. Pilot | 1 + ongoing | Weeks 6-12 |
| 7. Sale Prep | 1 | Week 8-10 |
| **Total** | **8-12 sessions** | **~10-12 weeks** |

## Critical Path

```
Phase 1 (Core Pipeline) ──→ Phase 2 (Swedish) ──→ Phase 3 (Trust/UX)
                                                          │
Phase 4 (Payments) ←──────────────────────────────────────┘
         │
         ├──→ Phase 5 (Video v3)
         │
         └──→ Phase 6 (Pilot) ──→ Phase 7 (Sale Prep)
```

Phase 1 is the blocker for everything else. Phases 2-3 can partially overlap.
Phase 5 (video) can start in parallel once Phase 3 output is final.
Phase 6 (pilot) requires Phases 1-4 complete.
Phase 7 (sale) requires Phase 6 traction data.

## Quality Standard

Each phase ends with:
1. Build passes (`npm run build`)
2. All new features manually tested
3. Committed and deployed to Vercel
4. Investor page updated if relevant metrics change
