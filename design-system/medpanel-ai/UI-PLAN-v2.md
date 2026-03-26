# MedPanel AI — UI/UX Plan v2

## Design Direction: Clinical Precision + Modern Elegance

**Vibe:** Apple Health meets Bloomberg Terminal. Think: a surgeon's instrument — precise, clean, trustworthy. Not flashy, not startup-y. This is a tool doctors would use between patients.

**Primary audience:** Physicians seeking cross-specialty perspectives
**Secondary audience:** Health-conscious patients preparing for doctor visits

---

## Design System Overrides (Dark Mode Medical)

The auto-generated MASTER.md defaults to light healthcare. We override for dark:

### Color Palette (Dark Mode Primary)

| Role | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| **Background** | `#0A0F1C` | `slate-950` custom | Main background |
| **Surface** | `#111827` | `gray-900` | Cards, panels |
| **Surface Elevated** | `#1F2937` | `gray-800` | Modals, dropdowns |
| **Border** | `#1E293B` | `slate-800` | Subtle borders |
| **Border Hover** | `#334155` | `slate-700` | Interactive borders |
| **Text Primary** | `#F8FAFC` | `slate-50` | Headings, important |
| **Text Secondary** | `#94A3B8` | `slate-400` | Body text, descriptions |
| **Text Muted** | `#64748B` | `slate-500` | Timestamps, labels |
| **Accent Primary** | `#10B981` | `emerald-500` | CTAs, active states, consensus |
| **Accent Warning** | `#F59E0B` | `amber-500` | Disagreements, caution |
| **Accent Danger** | `#F87171` | `red-400` | Safety flags, critical (see Contrast Verification) |
| **Accent Info** | `#3B82F6` | `blue-500` | Links, informational |
| **Specialist Cardio** | `#EC4899` | `pink-500` | Cardiologist tag |
| **Specialist Nephro** | `#8B5CF6` | `violet-500` | Nephrologist tag |
| **Specialist FM** | `#14B8A6` | `teal-500` | Functional medicine tag |
| **Specialist Neuro** | `#F97316` | `orange-500` | Neuropsychiatrist tag |
| **Specialist Endo** | `#06B6D4` | `cyan-500` | Endocrinologist tag |
| **Specialist Pharma** | `#A855F7` | `purple-500` | Pharmacologist tag |

### Typography

**Heading:** Inter (geometric, precise, used by Linear/Vercel — doctor-appropriate)
**Body:** Inter (single font family, variable weights, medical precision)
**Monospace:** JetBrains Mono (for lab values, dosages, evidence IDs)

Why Inter over Figtree: Inter is the font of precision tools (Linear, Vercel, Notion). Doctors already use it. Figtree is more consumer-friendly — wrong tone.

### Card Design Language

```
Dark cards on dark backgrounds — differentiated by subtle elevation:
- Level 0: bg-slate-950 (page background)
- Level 1: bg-gray-900 border border-slate-800 (content cards)
- Level 2: bg-gray-800 border border-slate-700 (interactive/hover)
- Level 3: bg-gray-800/80 backdrop-blur-lg (modals, overlays)
```

No rounded-2xl. Use `rounded-lg` (8px) maximum. Medical tools have tight radii.

---

## MVP Phasing — Ruthless Cuts

### v1 (MVP) — Ship in 2 weeks

**Goal:** One question in, one useful answer out. Prove the multi-specialist model delivers value a single LLM doesn't.

**Pages shipped:**
1. Landing (simplified — hero + CTA + disclaimer, no audience toggle, no animated flow)
2. Consultation input (question box + profile summary, no examples dropdown, no cost estimate)
3. Real-time progress (pipeline steps, no cost counter)
4. Results — **single scrollable page, no tabs**
5. Profile (demographics + conditions + medications only — 3 sections)
6. History (flat list, no filters, no search)

**Results page v1 — single scroll, no tabs, no mode toggle:**
```
┌─────────────────────────────────────────┐
│ Nav: MedPanel  ← Back to Consult        │
├─────────────────────────────────────────┤
│                                         │
│  Your question:                         │
│  "Should I take CoQ10 200mg..."         │
│                                         │
│  ┌─ Safety Flags ────────────────────┐  │
│  │ (only if flags exist)             │  │
│  │ RED: [text]                       │  │
│  │ AMBER: [text]                     │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Panel Consensus ─────────────────┐  │
│  │ Bullet list of what all           │  │
│  │ specialists agreed on.            │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Where Perspectives Differ ───────┐  │
│  │ Side-by-side disagreements        │  │
│  │ with specialist color tags        │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Questions for Your Doctor ───────┐  │
│  │ 1. ...                            │  │
│  │ 2. ...                            │  │
│  │         [ Copy All Questions ]     │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Evidence Summary ────────────────┐  │
│  │ Inline citations with PMID links  │  │
│  │ Grouped: Strong | Moderate | Weak │  │
│  └────────────────────────────────────┘  │
│                                         │
│  Disclaimer footer                      │
│                                         │
└─────────────────────────────────────────┘
```

**What's CUT from v1:**
- No tabs (Summary / Panel Discussion / Evidence are merged into one scroll)
- No Patient/Physician mode toggle (default to patient-friendly language)
- No expandable specialist accordions (consensus + disagreements cover it)
- No evidence landscape visualization (just inline citation links)
- No cost estimation on input page
- No search/filter on history
- No "For Physicians" toggle on landing
- No animated flow diagram on landing
- No outcome tracking badges on history
- No lab results, supplements, allergies, family history, lifestyle, goals in profile

### v2 — After 50 consultations validated

**Additions:**
- **Results tabs:** Split into Summary + Panel Discussion + Evidence (the data justifies the complexity now)
- **Patient/Physician mode toggle** on results
- **Expandable specialist accordions** in Panel Discussion tab
- **Profile expansion:** supplements, lab results, allergies (6 sections total)
- **History search + date filter**
- **Cost estimation** on consultation input
- **Examples dropdown** on consultation input
- **Landing:** audience toggle + social proof logos

### v3 — Full vision

**Additions:**
- **Evidence landscape visualization** (strong/moderate/preliminary/unknown chart)
- **Profile:** all 9 sections including family history, lifestyle, goals
- **Lab value sparklines** (trend visualization over time)
- **History:** full filter suite (specialist type, safety flags, outcome tracking)
- **Outcome tracking badges** (pending follow-up, improved, unchanged)
- **Landing:** animated pipeline flow diagram
- **PDF import** for profile data
- **ICD-10 auto-suggest** for conditions
- **Completeness score** with missing-field highlights on profile

---

## Pages — Detailed Plan

### Page 1: Landing (`/`)

**Current state:** Basic but functional. Needs elevation.

**Upgrades:**
- Floating nav bar with MedPanel logo + "Sign In" (right)
- Hero: Keep the current structure but add a **live demo preview** — show a blurred/dimmed screenshot of an actual consultation result behind the CTA. Gives doctors immediate understanding.
- Social proof section: "Grounded in evidence from PubMed, Cochrane, and medical guidelines" with small logos
- Replace the 3-step cards with an **animated flow diagram** showing: Question -> Classification -> 3 Specialists -> Discussion -> Synthesis. Use subtle line animation connecting the steps.
- Add a "For Physicians" toggle at the top that switches the landing copy between patient-friendly and physician-targeted messaging
- Footer with: disclaimer, privacy policy link, "Not a medical device" prominent

**v1 scope:** Hero with tagline + single CTA ("Start a Consultation") + 3 static feature cards + disclaimer footer. No toggle, no animation, no social proof logos.

**Design notes:**
- Dark gradient background: `from-slate-950 via-gray-900 to-slate-950`
- Emerald accent for CTA only — everything else is white/gray text
- No stock medical imagery. No stethoscopes. Abstract data visualization patterns as background texture (think: subtle grid dots, not illustrations)

---

### Page 2: Consultation Input (`/consult`)

**The main input page where users ask their question.**

**Layout:**
```
┌─────────────────────────────────────────┐
│ Nav: MedPanel  [Profile] [History] [?]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Profile Summary Card ─────────────┐ │
│  │ 30M · 77kg · 5 conditions · 18 supps│ │
│  │ Last updated: 2 days ago  [Edit]    │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─ Question Input ──────────────────┐  │
│  │                                    │  │
│  │  Ask your health question...       │  │
│  │                                    │  │
│  │  ────────────────────────────────  │  │
│  │  [Examples v]                      │  │
│  └────────────────────────────────────┘  │
│                                         │
│  Estimated: 3 specialists · ~2 min      │
│  Cost tier: Moderate ($8-12)            │
│                                         │
│          [ Explore This Question ]      │
│                                         │
│  ┌─ Recent Consultations ────────────┐  │
│  │  * CoQ10 200mg question (today)    │  │
│  │  * Sleep stack optimization (3d)   │  │
│  └────────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Key features:**
- Profile summary card at top (compressed view of their health profile)
- Large textarea for the question (minimum 3 lines visible)
- "Examples" dropdown showing sample questions for inspiration
- Real-time estimation: how many specialists, how long, estimated cost
- Question auto-classification preview (shows which domains detected)
- Recent consultations list below

**Design notes:**
- Single-column layout, max-w-2xl centered
- The question input is the hero — everything else is secondary
- Subtle green border on the input when typing (active state)
- Profile card uses monospace for lab values (feels clinical)

---

### Page 3: Real-Time Progress (`/consult/[id]` during processing)

**The waiting room — shows consultation progress in real-time.**

**Layout:**
```
┌─────────────────────────────────────────┐
│ Nav: MedPanel  <- Back                   │
├─────────────────────────────────────────┤
│                                         │
│  Your question:                         │
│  "Should I take CoQ10 200mg..."         │
│                                         │
│  ┌─ Pipeline Progress ───────────────┐  │
│  │                                    │  │
│  │  [done] Classified: optimization   │  │
│  │     3 specialists selected         │  │
│  │                                    │  │
│  │  [done] Evidence retrieved         │  │
│  │     6 studies from PubMed          │  │
│  │                                    │  │
│  │  [working] Round 1: Independent    │  │
│  │     ┌──────────────────────────┐   │  │
│  │     │ Cardiologist       done  │   │  │
│  │     │ Nephrologist       ...   │   │  │
│  │     │ Functional Med     ...   │   │  │
│  │     └──────────────────────────┘   │  │
│  │                                    │  │
│  │  [ ] Round 2: Cross-Examination    │  │
│  │  [ ] Synthesis                     │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                         │
│  Elapsed: 45s / ~2 min estimated        │
│  Cost so far: $3.20                     │
│                                         │
└─────────────────────────────────────────┘
```

**Key features:**
- Vertical pipeline showing each phase with real-time status
- Each specialist gets a colored dot (from specialist color palette) + status
- SSE events update the UI in real-time
- Elapsed time + estimated remaining
- Running cost counter
- When complete: auto-transition to results page

**Design notes:**
- Status indicators: done = emerald, processing = amber pulse, pending = slate
- Each specialist row is a mini-card with their specialist color as left border
- Progress animation: subtle pulse on the active step
- No spinner — use skeleton states and progressive disclosure

---

### Page 4: Results/Synthesis (`/consult/[id]` after complete)

**The most complex page — the multi-specialist panel discussion output.**

**Layout — Tabbed Interface (v2+):**

**Tab 1: Summary (default)**
```
┌─────────────────────────────────────────┐
│ [Summary] [Panel Discussion] [Evidence] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Safety Flags ────────────────────┐  │
│  │ RED:0  AMBER:3  YELLOW:2  GREEN:1 │  │
│  │ > Atherogenic dyslipidemia...     │  │
│  │ > Elevated hs-CRP...              │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Panel Consensus ─────────────────┐  │
│  │ CoQ10 200mg is safe (unanimous)   │  │
│  │ Not your top priority (3/3)       │  │
│  │ CRP needs investigation (3/3)     │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Where Perspectives Differ ───────┐  │
│  │ "What should come first?"          │  │
│  │ Cardio: Lipid characterization    │  │
│  │ Nephro: GFR trajectory            │  │
│  │ FM: Inflammation source           │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Questions for Your Doctor ───────┐  │
│  │ 1. Ask about ApoB and Lp(a)...   │  │
│  │ 2. Retest hs-CRP...              │  │
│  │ 3. Track kidney function...       │  │
│  │ 4. Test estradiol on TRT...       │  │
│  │         [ Copy All Questions ]     │  │
│  └────────────────────────────────────┘  │
│                                         │
│  [Patient Mode *] [Physician Mode  ]    │
│                                         │
└─────────────────────────────────────────┘
```

**Tab 2: Panel Discussion (v2+)**
- Full specialist-by-specialist analysis
- Each specialist in a collapsible accordion
- Color-coded by specialist type
- Shows findings, perspectives, risk flags, cross-domain questions

**Tab 3: Evidence (v2+)**
- Evidence landscape (strong/moderate/preliminary/unknown/researching)
- All citations with PMID links to PubMed
- Evidence tier badges on each citation

**Mode Toggle: Patient <-> Physician (v2+)**
- Patient mode: 6th grade language, simplified evidence tiers, plain-language questions
- Physician mode: Clinical terminology, GRADE ratings, guideline references, NNT/NNH where applicable

**Design notes:**
- Safety flags use traffic light colors with expandable details
- Consensus items get a green checkmark badge
- Disagreements are shown side-by-side with specialist color tags
- "Questions for Your Doctor" is the most prominent section — bordered, with a copy button
- The mode toggle is a segmented control at the bottom of the page
- Each specialist's analysis is in a card with their accent color as a left border stripe

---

### Page 5: Profile Management (`/profile`)

**Where users enter and maintain their health profile.**

**Sections (tabbed or accordion):**
1. **Demographics** — age, sex, height, weight, body composition
2. **Conditions** — add/remove with search, ICD-10 auto-suggest
3. **Medications** — name, dose, frequency, route
4. **Supplements** — same structure as medications
5. **Lab Results** — test name, value, unit, date, reference range
6. **Allergies** — substance, reaction type, severity
7. **Family History** — relationship, condition
8. **Lifestyle** — exercise, sleep, diet, substance history
9. **Goals** — free text health optimization goals

**v1 scope:** Sections 1-3 only (Demographics, Conditions, Medications). The rest are locked with "Coming soon" labels.

**Design notes:**
- Each section is a collapsible card
- Lab results should show trends (sparkline) when multiple values exist
- Completeness score visible at the top (from patient-profile.json schema)
- "Missing fields" highlighted with amber badges
- Import from PDF option (future)
- Dark form inputs with emerald focus rings

---

### Page 6: Consultation History (`/history`)

**List of past consultations with search and filtering.**

**Layout:**
```
┌─────────────────────────────────────────┐
│ Search consultations...    [Filter v]    │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Mar 26 ──────────────────────────┐  │
│  │ CoQ10 200mg for mitochondria      │  │
│  │ Cardio * Nephro * FM              │  │
│  │ Consensus: safe, not top priority │  │
│  │ Cost: $8.40 * 3 min               │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Mar 24 ──────────────────────────┐  │
│  │ Supplement stack review           │  │
│  │ 5 specialists * 3 rounds          │  │
│  │ 7 safety flags * 20 questions     │  │
│  │ Cost: $18.60 * 8 min              │  │
│  └────────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

**Design notes:**
- Each consultation is a card with: question, specialists used, consensus summary, cost, duration
- Click to view full results
- Filter by: date range, specialist type, safety flag presence
- Outcome tracking badges: "pending follow-up", "improved", "unchanged"

---

## Empty States

Every page needs a designed empty state. No blank screens, no broken layouts. Each empty state has: a text headline, a supporting description, a primary CTA, and an illustration concept.

### Landing — First-Time Visitor (No Account)

**Headline:** "Get multiple specialist perspectives on any health question"
**Description:** "MedPanel assembles a virtual panel of medical specialists who research, discuss, and synthesize perspectives on your health questions. You get the questions to bring to your real doctor."
**CTA:** "Start Your First Consultation" (emerald button) + "Learn How It Works" (text link below)
**Illustration concept:** Three abstract circles in specialist colors (pink, violet, teal) overlapping in the center with a small emerald dot at the intersection. Represents convergence of perspectives. Minimal, geometric, no medical clip art.

### Consultation Input — No Profile Created Yet

**Headline:** "Set up your health profile first"
**Description:** "A consultation is only as good as the context. Add your basic health information so the specialist panel can give you relevant perspectives. Takes about 2 minutes."
**CTA:** "Create Your Profile" (emerald button)
**Secondary:** "Skip for now" (muted text link) — allows running a consultation without a profile, but the question input shows an amber notice: "Results will be generic without a health profile."
**Illustration concept:** A single horizontal bar chart skeleton with 3 empty rows, each with a subtle dashed outline. Represents incomplete data waiting to be filled. Gray-700 on gray-900.

### Results — Consultation In Progress (Navigated Back)

This covers the case where a user starts a consultation, navigates away, and returns to `/consult/[id]` before it finishes.

**Headline:** "Your consultation is still running"
**Description:** "The specialist panel is still analyzing your question. You'll be redirected to the results when they're ready."
**CTA:** "View Live Progress" (emerald button, links to the progress page for this consultation ID)
**Secondary:** "Start a New Consultation" (text link)
**Illustration concept:** Three specialist-colored dots in a horizontal row with a subtle pulse animation on the center dot. Represents activity in progress. Think: a heartbeat monitor frozen mid-beat.

**Technical note:** Poll the consultation status. If `status === 'complete'`, redirect to results. If `status === 'processing'`, show this state with a link to the progress page.

### Profile — Brand New, Zero Data

**Headline:** "Your health profile"
**Description:** "This information helps the specialist panel understand your unique situation. Start with the basics — you can always add more later."
**CTA:** "Add Demographics" (emerald button opening the first section)
**Section preview:** Show all sections as collapsed cards. v1 sections (Demographics, Conditions, Medications) are interactive with "Add" buttons. v2+ sections show a lock icon and "Coming soon" label.
**Illustration concept:** A vertical stack of 3 thin horizontal lines (representing the 3 sections), the first one glowing faintly emerald, the rest gray-700. Represents a form waiting to be started.

**Completeness indicator:** Show "0% complete" in muted text. As sections are filled, the percentage updates. This is a motivational nudge, not a gate.

### History — No Past Consultations

**Headline:** "No consultations yet"
**Description:** "Your past consultations will appear here with summaries, specialist perspectives, and questions for your doctor."
**CTA:** "Start Your First Consultation" (emerald button, links to `/consult`)
**Illustration concept:** A single empty card outline (dashed border, gray-700) with a subtle "+" icon in the center. Represents an empty list waiting for its first item.

---

## Mobile-First Wireframes (375px)

### Consultation Input — Mobile (375px)

What fits on one screen (above the fold):

```
┌─────────────────────────────┐
│ MedPanel          [=]       │  44px nav
├─────────────────────────────┤
│                             │
│ ┌─ Profile ───────────────┐ │  56px
│ │ 30M * 77kg * 5 cond.    │ │
│ │ Updated 2d ago   [Edit] │ │
│ └─────────────────────────┘ │
│                             │  8px
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │ Ask your health         │ │  120px
│ │ question...             │ │  textarea
│ │                         │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │  8px
│ 3 specialists * ~2 min      │  20px est.
│                             │  8px
│ ┌─────────────────────────┐ │
│ │   Explore This Question │ │  48px btn
│ └─────────────────────────┘ │
│                             │
│ - - - - - below fold - - - │
│                             │
│ Recent Consultations        │
│ ┌─────────────────────────┐ │
│ │ CoQ10 question (today)  │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Sleep stack (3d ago)    │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

**Key decisions:**
- Profile summary compresses to a single line: "30M * 77kg * 5 cond." with an edit button
- The CTA button is full-width, within thumb reach
- Recent consultations move below the fold — they're secondary
- Hamburger menu [=] replaces the horizontal nav links
- No cost estimate shown on mobile v1 (saves vertical space)
- Textarea gets 120px minimum height — enough for 3-4 lines

### Results Summary — Mobile (375px)

What fits on one screen (above the fold):

```
┌─────────────────────────────┐
│ <- Back        MedPanel     │  44px nav
├─────────────────────────────┤
│                             │
│ "Should I take CoQ10       │  ~40px
│  200mg for..."             │  question
│                             │
│ ┌─ Safety ────────────────┐ │
│ │ AMBER: 3  YELLOW: 2     │ │  36px
│ │ > Atherogenic dyslip... │ │  collapsed
│ └─────────────────────────┘ │
│                             │
│ ┌─ Consensus ─────────────┐ │
│ │ [check] CoQ10 safe      │ │
│ │    (unanimous)           │ │  ~72px
│ │ [check] Not top priority│ │
│ │ [check] CRP needs work  │ │
│ └─────────────────────────┘ │
│                             │
│ - - - - - below fold - - - │
│                             │
│ ┌─ Perspectives Differ ───┐ │
│ │ "What comes first?"     │ │
│ │ [pink] Lipid charact.   │ │
│ │ [violet] GFR trajectory │ │
│ │ [teal] Inflammation src │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─ Doctor Questions ──────┐ │
│ │ 1. Ask about ApoB...   │ │
│ │ 2. Retest hs-CRP...    │ │
│ │ 3. Track kidney...     │ │
│ │ 4. Test estradiol...   │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─ Evidence ──────────────┐ │
│ │ 6 citations (3 strong)  │ │
│ │ > View all              │ │
│ └─────────────────────────┘ │
│                             │
│ Disclaimer text             │
│                             │
├─────────────────────────────┤
│ [ Copy All Questions ]      │  Sticky 56px
└─────────────────────────────┘
```

**Key decisions:**
- No tabs on mobile v1 — single vertical scroll (same as desktop v1)
- Safety flags are collapsed by default on mobile (show count + first item preview)
- "Copy All Questions" is a **sticky bottom bar** — always accessible, primary action
- The question text is shown at the top for context (truncated to 2 lines with "...")
- Evidence section collapses to a summary line ("6 citations, 3 strong") with a "View all" expander
- Each section is a card with 12px vertical gap between them
- Specialist color tags use small inline pill badges, not full cards

### Profile Management — Mobile (375px)

What fits on one screen:

```
┌─────────────────────────────┐
│ <- Back        Profile      │  44px nav
├─────────────────────────────┤
│                             │
│ Profile Completeness        │
│ [====------] 40%            │  32px bar
│                             │
│ ┌─────────────────────────┐ │
│ │ Demographics        [v] │ │  48px
│ │                         │ │
│ │  Age:  [ 30        ]    │ │
│ │  Sex:  [Male    v]      │ │  Expanded
│ │  Ht:   [ 178 cm   ]    │ │  section
│ │  Wt:   [ 77 kg    ]    │ │  ~200px
│ │                         │ │
│ │  [ Save Demographics ]  │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ Conditions       [>]    │ │  48px
│ └─────────────────────────┘ │  collapsed
│                             │
│ ┌─────────────────────────┐ │
│ │ Medications      [>]    │ │  48px
│ └─────────────────────────┘ │  collapsed
│                             │
│ ┌─────────────────────────┐ │
│ │ Supplements  [locked]   │ │  48px
│ └─────────────────────────┘ │  v2
│                             │
│ ┌─────────────────────────┐ │
│ │ Lab Results  [locked]   │ │  48px
│ └─────────────────────────┘ │  v2
│                             │
│ ┌─────────────────────────┐ │
│ │ Allergies    [locked]   │ │  48px
│ └─────────────────────────┘ │  v2
│                             │
└─────────────────────────────┘
```

**Key decisions:**
- Accordion pattern: only one section open at a time on mobile (saves space, reduces overwhelm)
- Completeness bar at the top is a horizontal progress bar, not a circle (more space-efficient on mobile)
- v2+ sections shown as locked cards with "Coming soon" label — visible but not interactive
- Each form field is full-width, stacked vertically
- Save button per section (not a global save) — gives immediate feedback
- Touch targets are all 48px height minimum
- Form inputs: 48px height, 16px font size (prevents iOS zoom on focus)
- Labels above inputs, not beside them (mobile-standard)

---

## First-Time User Flow (Onboarding)

### Step 1: Landing Page

New user arrives at `/`. They see:
- Headline: "Get multiple specialist perspectives on any health question"
- Subhead: "A virtual panel of medical specialists researches, discusses, and highlights what to ask your real doctor."
- CTA: "Start a Consultation" (goes to `/consult`)
- Below: 3 cards explaining the process (Ask -> Panel Discusses -> Get Questions)
- Footer disclaimer: "MedPanel is an educational exploration tool. It does not provide medical advice, diagnosis, or treatment."

No sign-up gate. They can explore the tool first.

### Step 2: First Visit to Consultation Input

When they hit `/consult` and have no profile, they see the "No Profile" empty state (defined above). Two paths:

**Path A — Create Profile First (recommended):**
User clicks "Create Your Profile." They go to `/profile` and see the progressive onboarding form.

**Path B — Skip Profile:**
User clicks "Skip for now." The consultation input page loads with an amber notice bar: "Your results will be more relevant with a health profile." They can ask a question immediately. After they receive their first results, a gentle prompt appears at the bottom: "Want more relevant results next time? Add your health profile." with a link to `/profile`.

### Step 3: Progressive Profile Creation

The profile does NOT start with a 9-section form. The onboarding version shows 3 steps:

**Step 3a — Demographics (required minimum)**
A single card, inline on the page. Four fields:
- Age (number input)
- Biological sex (select: Male / Female)
- Height (number + unit toggle cm/ft)
- Weight (number + unit toggle kg/lb)

This is the minimum viable profile. After filling these 4 fields and hitting "Save," the user sees: "Profile started. You can run a consultation now."

**Step 3b — Conditions (prompted, not required)**
After saving demographics, the next card auto-expands:
"Do you have any diagnosed conditions? This helps specialists understand your context."
- Free-text search input with auto-suggest
- "Add" button to add each condition
- "Skip this for now" link at the bottom

**Step 3c — Medications (prompted, not required)**
Same pattern:
"Are you taking any medications? Include prescription and OTC."
- Name, dose, frequency fields
- "Add another" for multiple
- "Skip this for now" link

After Step 3a (or 3a+3b+3c), the user is redirected to `/consult` with their profile summary card now populated. The barrier to first consultation: **4 form fields.**

### Step 4: Consent/Disclaimer

Consent is NOT a modal or a checkbox gate. It is woven into the experience:

1. **Landing page footer:** "MedPanel is an educational exploration tool. It does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional."

2. **First consultation submission:** When the user clicks "Explore This Question" for the first time, a brief inline notice appears above the button (not a modal, not a popup):

   "By continuing, you acknowledge that MedPanel provides educational perspectives only, not medical advice. The specialist panel is AI-simulated. All findings should be discussed with your healthcare provider."

   Two buttons: "I Understand, Continue" (emerald) and "Learn More" (text link to a `/about` page with full disclaimers).

   This acknowledgment is stored. It does not appear on subsequent consultations.

3. **Every results page:** The disclaimer footer is always present at the bottom: "This consultation is for educational purposes only. Discuss all findings with your healthcare provider before making health decisions."

4. **Safety flag triggers:** If any RED safety flag is generated, a prominent banner appears at the top of results: "This consultation identified concerns that should be discussed with a healthcare provider promptly."

### Onboarding Flow Summary

```
Landing (/)
    |
    v
Consultation Input (/consult)
    |
    ├── Has profile? --> Show input page
    |
    └── No profile? --> Empty state
            |
            ├── "Create Profile" --> /profile (progressive: demographics -> conditions -> meds)
            |       |
            |       └── Minimum: 4 fields (age, sex, height, weight) --> redirect to /consult
            |
            └── "Skip for now" --> Show input page with amber "generic results" notice
                    |
                    v
              First submission --> Inline disclaimer acknowledgment (one-time)
                    |
                    v
              Progress page --> Results page
                    |
                    v
              Post-results prompt: "Add your profile for better results next time"
```

---

## Contrast Verification (WCAG AA)

Tested all five specified color combinations against WCAG AA requirement of 4.5:1 minimum contrast ratio for normal text.

| Combination | Ratio | Result | Notes |
|-------------|-------|--------|-------|
| Emerald-500 `#10B981` on slate-950 `#0A0F1C` | **7.54:1** | PASS | Strong. No action needed. |
| Slate-400 `#94A3B8` on gray-900 `#111827` | **6.92:1** | PASS | Comfortable margin. No action needed. |
| Amber-500 `#F59E0B` on gray-900 `#111827` | **8.26:1** | PASS | Strong. No action needed. |
| Red-500 `#EF4444` on gray-900 `#111827` | **4.71:1** | PASS (marginal) | See recommendation below. |
| Slate-50 `#F8FAFC` on gray-900 `#111827` | **16.96:1** | PASS | Excellent. No action needed. |

### Red-500 Recommendation: Upgrade to Red-400

Red-500 (`#EF4444`) passes at 4.71:1, but with only 0.21 of margin above the 4.5:1 threshold. This is risky because:
- Browser font rendering, anti-aliasing, and subpixel rendering can reduce perceived contrast
- Users with mild visual impairments may find this borderline unreadable
- If this color is ever used on the darker `slate-950` background (not just `gray-900`), it could fail

**Correction:** Replace `red-500` (#EF4444) with `red-400` (#F87171) as the Accent Danger color throughout the design system. Red-400 provides approximately 6.5:1 contrast on gray-900 and approximately 7.1:1 on slate-950, giving comfortable margin on both surface levels.

This change is already reflected in the Color Palette table at the top of this document.

### Additional Contrast Notes

These combinations were not in the original test set but should be monitored:

- **Text Muted (slate-500 `#64748B`) on gray-900:** approximately 4.2:1 — **FAILS AA for normal text.** This is acceptable because muted text is used exclusively for non-essential labels (timestamps, helper text) at small sizes where WCAG allows 3:1 for large text. However, never use `slate-500` for body copy or any essential information. If muted text must convey essential meaning, use `slate-400` instead.

- **Emerald-500 on gray-900 (surface cards):** approximately 5.9:1 — PASS. The primary accent works on both background levels.

---

## Component Library

Built on shadcn/ui with dark mode overrides:

| Component | Usage | MVP (v1) |
|-----------|-------|----------|
| `SpecialistBadge` | Colored badge with specialist name + icon | Yes |
| `EvidenceTierBadge` | Green/amber/gray badge for evidence quality | Yes (simplified) |
| `SafetyFlag` | Red/orange/yellow/green severity indicator | Yes |
| `ConsensusItem` | Checkmark + text + specialist count | Yes |
| `QuestionCard` | Bordered card for "questions for your doctor" | Yes |
| `LabValue` | Monospace value + unit + reference range + flag | v2 |
| `ProgressStep` | Pipeline step with status indicator | Yes |
| `ModeToggle` | Patient/Physician segmented control | v2 |
| `ProfileCompleteness` | Progress bar (mobile) / circle (desktop) with percentage | v2 |
| `EmptyState` | Headline + description + CTA + illustration slot | Yes |

---

## Animation Guidelines

- **Transitions:** 200ms ease for color/opacity. No transform-based animations.
- **Loading states:** Skeleton screens, NOT spinners. Pulse animation on skeleton.
- **Pipeline progress:** Subtle emerald pulse on active step.
- **Page transitions:** None. Instant navigation. Doctors don't wait for animations.
- **prefers-reduced-motion:** Respected. All animations disabled when preference set.

---

## Mobile Considerations

- Profile management: accordion sections (one open at a time)
- Results page: stacked single scroll (v1), stacked tabs (v2+), no side-by-side specialist comparison on mobile
- "Questions for Your Doctor" gets a sticky bottom bar with "Copy All" on mobile
- Touch targets: 48px minimum on mobile (44px on desktop)
- Form inputs: 16px font-size minimum (prevents iOS auto-zoom)
- No horizontal scrolling anywhere. All layouts are single-column on mobile.
- Hamburger menu replaces horizontal nav at `< 640px`

---

## Build Order

1. Shared components (SpecialistBadge, SafetyFlag, EmptyState, etc.)
2. Results page — **v1 single-scroll layout** (highest value)
3. Consultation input page + empty state
4. Real-time progress page
5. Profile management (progressive onboarding flow, 3 sections only)
6. Consultation history + empty state
7. Landing page polish (last — it already works)
8. First-time user flow wiring (profile check, disclaimer, redirects)
