# MedPanel AI — UI/UX Plan

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
| **Accent Danger** | `#EF4444` | `red-500` | Safety flags, critical |
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

## Pages — Detailed Plan

### Page 1: Landing (`/`)

**Current state:** Basic but functional. Needs elevation.

**Upgrades:**
- Floating nav bar with MedPanel logo + "Sign In" (right)
- Hero: Keep the current structure but add a **live demo preview** — show a blurred/dimmed screenshot of an actual consultation result behind the CTA. Gives doctors immediate understanding.
- Social proof section: "Grounded in evidence from PubMed, Cochrane, and medical guidelines" with small logos
- Replace the 3-step cards with an **animated flow diagram** showing: Question → Classification → 3 Specialists → Discussion → Synthesis. Use subtle line animation connecting the steps.
- Add a "For Physicians" toggle at the top that switches the landing copy between patient-friendly and physician-targeted messaging
- Footer with: disclaimer, privacy policy link, "Not a medical device" prominent

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
│  │  [Examples ▾]                      │  │
│  └────────────────────────────────────┘  │
│                                         │
│  Estimated: 3 specialists · ~2 min      │
│  Cost tier: Moderate ($8-12)            │
│                                         │
│          [ Explore This Question ]      │
│                                         │
│  ┌─ Recent Consultations ────────────┐  │
│  │  • CoQ10 200mg question (today)    │  │
│  │  • Sleep stack optimization (3d)   │  │
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
│ Nav: MedPanel  ← Back                   │
├─────────────────────────────────────────┤
│                                         │
│  Your question:                         │
│  "Should I take CoQ10 200mg..."         │
│                                         │
│  ┌─ Pipeline Progress ───────────────┐  │
│  │                                    │  │
│  │  ✅ Classified: optimization       │  │
│  │     3 specialists selected         │  │
│  │                                    │  │
│  │  ✅ Evidence retrieved             │  │
│  │     6 studies from PubMed          │  │
│  │                                    │  │
│  │  ⏳ Round 1: Independent Analysis  │  │
│  │     ┌──────────────────────────┐   │  │
│  │     │ 🟢 Cardiologist    done  │   │  │
│  │     │ ⏳ Nephrologist    ...   │   │  │
│  │     │ ⏳ Functional Med  ...   │   │  │
│  │     └──────────────────────────┘   │  │
│  │                                    │  │
│  │  ○ Round 2: Cross-Examination      │  │
│  │  ○ Synthesis                       │  │
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
- Status indicators: ✅ done (emerald), ⏳ processing (amber pulse), ○ pending (slate)
- Each specialist row is a mini-card with their specialist color as left border
- Progress animation: subtle pulse on the active step
- No spinner — use skeleton states and progressive disclosure

---

### Page 4: Results/Synthesis (`/consult/[id]` after complete)

**The most complex page — the multi-specialist panel discussion output.**

**Layout — Tabbed Interface:**

**Tab 1: Summary (default)**
```
┌─────────────────────────────────────────┐
│ [Summary] [Panel Discussion] [Evidence] │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Safety Flags ────────────────────┐  │
│  │ 🔴 0  🟠 3  🟡 2  🟢 1           │  │
│  │ ► Atherogenic dyslipidemia...     │  │
│  │ ► Elevated hs-CRP...              │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Panel Consensus ─────────────────┐  │
│  │ ✓ CoQ10 200mg is safe (unanimous) │  │
│  │ ✓ Not your top priority (3/3)     │  │
│  │ ✓ CRP needs investigation (3/3)   │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Where Perspectives Differ ───────┐  │
│  │ "What should come first?"          │  │
│  │ ┌ Cardio: Lipid characterization  │  │
│  │ ┌ Nephro: GFR trajectory          │  │
│  │ └ FM: Inflammation source         │  │
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
│  [Patient Mode ●] [Physician Mode ○]    │
│                                         │
└─────────────────────────────────────────┘
```

**Tab 2: Panel Discussion**
- Full specialist-by-specialist analysis
- Each specialist in a collapsible accordion
- Color-coded by specialist type
- Shows findings, perspectives, risk flags, cross-domain questions

**Tab 3: Evidence**
- Evidence landscape (strong/moderate/preliminary/unknown/researching)
- All citations with PMID links to PubMed
- Evidence tier badges on each citation

**Mode Toggle: Patient ↔ Physician**
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
│ Search consultations...    [Filter ▾]    │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Mar 26 ──────────────────────────┐  │
│  │ CoQ10 200mg for mitochondria      │  │
│  │ Cardio · Nephro · FM              │  │
│  │ Consensus: safe, not top priority │  │
│  │ Cost: $8.40 · 3 min               │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─ Mar 24 ──────────────────────────┐  │
│  │ Supplement stack review           │  │
│  │ 5 specialists · 3 rounds          │  │
│  │ 7 safety flags · 20 questions     │  │
│  │ Cost: $18.60 · 8 min              │  │
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

## Component Library

Built on shadcn/ui with dark mode overrides:

| Component | Usage |
|-----------|-------|
| `SpecialistBadge` | Colored badge with specialist name + icon |
| `EvidenceTierBadge` | Green/amber/gray badge for evidence quality |
| `SafetyFlag` | Red/orange/yellow/green severity indicator |
| `ConsensusItem` | Checkmark + text + specialist count |
| `QuestionCard` | Bordered card for "questions for your doctor" |
| `LabValue` | Monospace value + unit + reference range + flag |
| `ProgressStep` | Pipeline step with status indicator |
| `ModeToggle` | Patient/Physician segmented control |
| `ProfileCompleteness` | Circular progress with percentage |

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
- Results page: stacked tabs (full-width), no side-by-side specialist comparison on mobile
- "Questions for Your Doctor" gets a sticky bottom bar with "Copy All" on mobile
- Touch targets: 44px minimum everywhere

---

## Build Order

1. Shared components (SpecialistBadge, SafetyFlag, etc.)
2. Results page (the most complex, highest value)
3. Consultation input page
4. Real-time progress page
5. Profile management
6. Consultation history
7. Landing page polish (last — it already works)
