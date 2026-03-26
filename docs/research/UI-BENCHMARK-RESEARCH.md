# MedPanel AI -- UI/UX Benchmark Research

Competitive design analysis of 6 products. Specific patterns, not theory.

---

## 1. UpToDate (Clinical Decision Support)

### Results Page Layout

**Information hierarchy (top to bottom):**
1. **Topic title** -- plain, authoritative heading (e.g., "Treatment of hypertension in older adults")
2. **Topic Outline** -- collapsible left-rail table of contents. Sections: General Principles, Epidemiology, Etiology, Clinical Manifestations, Assessment, Diagnosis, Therapy, Complications, Practice Guidelines, Summary & Recommendations, References. Clicking jumps to section.
3. **Inline content** -- long-form narrative text with hyperlinked graphics (37,000+ graphics, tables, algorithms, graphs, videos) and embedded calculators (210+) throughout.
4. **Summary and Recommendations** -- always the penultimate section, boxed/highlighted region. This is what 80% of clinicians read first. Contains the GRADE-badged recommendations.
5. **References** -- numbered, linked to PubMed.

**Key pattern: "Summary first, depth on demand."** The Summary & Recommendations section acts as an executive summary. Detailed evidence lives in the body. Clinicians skim the summary, then drill into specific sections via the outline.

### Evidence Grade Presentation

UpToDate uses a **two-axis GRADE badge system:**
- **Strength:** 1 (Strong -- "We recommend") or 2 (Weak -- "We suggest")
- **Quality:** A (High), B (Moderate), C (Low)

Badges appear inline as parenthetical markers: **(Grade 1A)**, **(Grade 2B)**, **(Grade 2C)**. Each badge is a clickable link that opens a popup explaining what the grade means in context.

**Color coding (implicit):** UpToDate doesn't use color-coded badges. The grades are textual, relying on the alphanumeric system. This is deliberate -- clinical audiences trust text over color, and it avoids accessibility issues.

### What Builds Trust
- **Named authors and editors** on every topic (MD credentials visible)
- **"Last updated" date** prominently displayed (recency = relevance)
- **Graded recommendations** with transparent methodology
- **Society Guideline Links** section connecting to official guidelines
- **No ads, no decoration** -- pure content density signals authority
- **Serif-adjacent typography** in content areas (readability for long-form)

### MedPanel Takeaways
- Adopt the "Summary first, depth on demand" pattern for consultation results
- Use a similar two-axis evidence badge (strength + quality) displayed inline
- Show recency ("evidence as of" dates) prominently
- Keep the results page sparse -- no decorative elements in clinical content zones

---

## 2. Elicit.com (AI Research Tool)

### Multi-Source Synthesis

**Core pattern: The Evidence Table.**
- Papers in rows, extracted data points in columns
- Users define custom columns (e.g., "sample size", "intervention", "outcome measure")
- Each cell contains an AI-extracted answer with a sentence-level citation
- Clicking any cell reveals the **exact quote** from the source paper, shown in context

**Synthesis layer:**
- Above the table, Elicit generates a prose synthesis
- Every claim in the synthesis has a superscript citation number
- Clicking the citation jumps to the relevant paper/quote
- Reports can synthesize up to 80 papers

### Citation UX

**Sentence-level citations** -- the defining pattern:
- Every AI-generated sentence links back to the specific passage in the source paper
- Not just "Paper X said this" but "Page 4, paragraph 2 of Paper X contains this exact quote"
- **High Precision Mode** (paid): numbers assigned to each sentence, enabling granular verification

**Trust mechanism:** Users can verify any claim in under 3 seconds by clicking through to the source quote. This is the single most important trust pattern for AI-generated content.

### Loading/Progress UX

**Pattern: Progressive construction of a living document.**
- User submits query
- Skeleton of the results table appears immediately (rows for papers, empty columns)
- Results stream in cell-by-cell in non-linear order (fastest extractions first)
- Subtle placeholder indicators for in-progress cells -- NOT spinners. Elicit deliberately avoids "a screen full of spinners"
- The page stays interactive during loading -- users can edit columns, reorder, filter even before all results arrive
- For batch work, users can queue work and return later

**Key insight:** Thousands of individual LLM calls are assembled into the table. Response time per cell is highly variable (sub-second to minutes). The UX must accommodate this variance gracefully.

### Handling Uncertainty

- Confidence indicators on extracted data
- "Could not extract" states are explicit, not hidden
- Source quotes always available for human verification
- No hallucination hiding -- if the AI is uncertain, the cell shows it

### MedPanel Takeaways
- Implement sentence-level citations for every AI-generated claim
- Use progressive/streaming construction for the consultation result (skeleton first, content fills in)
- Show evidence as a structured table, not just prose
- Make verification instant: click any claim, see the source quote
- Avoid spinners -- use subtle static placeholders for pending content

---

## 3. Linear.app (Project Management)

### Dark Mode Implementation

**Color system:**
- Built on **LCH color space** (not HSL) -- perceptually uniform, meaning colors at the same lightness value truly appear equally light
- Theme defined by just 3 variables: **base color**, **accent color**, **contrast**
- Surface elevation hierarchy: background < foreground < panels < dialogs < modals, each a calculated step lighter in LCH
- Borders between surfaces use complementary shades auto-generated from core colors
- Dark mode backgrounds are near-black (not pure #000000), with content appearing lighter in dark mode and darker in light mode for improved contrast

**Specific color approach:**
- 146 brand colors in the design token set
- Base dark background: approximately #1B1B1F range (near-black with slight cool undertone)
- Surface cards: slightly elevated from background (2-4% lighter in LCH)
- Borders: 1px, very low opacity white (approximately 8-12% white overlay)
- Accent: purple-blue (#5E6AD2 is Linear's brand accent)
- Text: off-white (#E8E8ED range) for primary, dimmed for secondary

### Typography

- **Headings:** Inter Display (optical sizing optimized for large text)
- **Body:** Inter (the workhorse of modern SaaS)
- **39 typography styles** in the design system
- Font weight hierarchy: semibold headings, regular body, medium for UI labels

### What Makes It Feel "Premium"

1. **Keyboard-first design.** Cmd+K command palette for universal navigation. Every action has a shortcut. Power users never touch the mouse.
2. **Micro-interactions with purpose.** Sub-menu safe areas (triangle detection for mouse movement between menu trigger and submenu). Transitions are fast (100-200ms), never slow enough to feel like waiting.
3. **Restraint.** No gratuitous animation. Motion serves function (state transitions, focus shifts).
4. **Information density done right.** Lists show maximum useful data per row without feeling cramped. Generous vertical padding within rows, tight spacing between them.
5. **Command palette UX:** Instant-open, fuzzy search, categorized results, keyboard navigation. The palette feels like an extension of thought.

### Card/Panel Design
- Minimal border-radius (4-6px)
- Subtle box-shadow or border only (never both prominently)
- Content-forward: no decorative elements inside cards
- Status indicated by small colored dots or pills, not large badges

### MedPanel Takeaways
- Use LCH color space for theme generation (better perceptual uniformity)
- Implement Cmd+K command palette for power users (doctors are keyboard people)
- Inter / Inter Display for typography (proven, legible, professional)
- Keep border-radius small (4-6px), borders subtle (1px low-opacity)
- Motion: fast and purposeful, never decorative

---

## 4. Arc Browser (Dark Mode Elegance)

### Color System

**Space-based theming:**
- Each "Space" (workspace) gets its own color/gradient
- Colors defined via a color picker with saturation/intensity control + grain texture option
- Up to 3 complementary colors per space, creating subtle gradients
- Gradient flows across the sidebar, giving the app a living, personal feel

**CSS variable system (exposed to web content):**
```
--arc-palette-background
--arc-palette-foregroundPrimary
--arc-palette-foregroundSecondary
--arc-palette-title
--arc-palette-subtitle
--arc-palette-hover
--arc-palette-maxContrastColor
--arc-background-gradient-color0
--arc-background-gradient-color1
--arc-background-gradient-overlay-color0
--arc-background-gradient-overlay-color1
```

### Dark Mode Elegance Patterns

1. **Near-black, not pure black.** Background range: #0A0A0A to #1A1A1A. Pure black (#000000) creates harsh contrast; near-black is softer for extended viewing.
2. **Subtle gradients.** Nearly imperceptible color transitions (2-5% hue shift across the sidebar). Hard transitions break sophistication; the best dark mode gradients are almost invisible.
3. **macOS vibrancy/translucency.** Sidebar uses system-level blur/translucency materials, giving depth without hard shadows.
4. **Warm vs cool undertones.** Sidebar can have warm (brown/amber) or cool (blue/purple) undertones depending on Space color, adding personality without sacrificing legibility.
5. **Color saturation management.** In dark mode, colors are desaturated compared to light mode. Vivid colors on dark backgrounds cause eye strain.

### What Makes It Feel Premium
- The sidebar gradient creates a sense of "place" -- you know where you are
- Translucency connects the app to the desktop, making it feel native
- Typography is clean (SF Pro on macOS)
- Transitions are smooth (GPU-accelerated CSS transforms)

### MedPanel Takeaways
- Use near-black (#0D0D12 to #151519), never pure black
- Subtle background gradients in specialist panels (each specialist could have a barely-visible color accent)
- Desaturate accent colors in dark mode (70-80% of light mode saturation)
- Consider translucent panels for overlay/modal content

---

## 5. Apple Health (Medical Data Presentation)

### Lab Results Presentation

**The reference range bar pattern:**
- Horizontal bar showing the normal range (green)
- A dot/marker showing where the user's value falls
- In-range: green dot inside the green bar
- Out-of-range: orange dot outside the bar, with the bar visible for context
- This gives instant visual comprehension: "am I normal or not?"

### Color Coding System

| Category | Color | Usage |
|----------|-------|-------|
| Activity | Orange | Steps, exercise, calories |
| Body Measurements | Purple | Weight, height, BMI |
| Heart | Red | Heart rate, ECG |
| Respiratory | Blue | Breathing, blood oxygen |
| Sleep | Cyan/Teal | Sleep analysis |
| Nutrition | Green | Diet, vitamins |
| Mental Wellbeing | Blue-green | Mindfulness, mood |
| Normal/in-range | Green | Lab results within reference |
| Abnormal/out-of-range | Orange | Lab results outside reference |

### Data Density Management

1. **Card-based summary dashboard.** Favorites pinned at top. Each card shows: metric name, current value, sparkline trend, and time range.
2. **Progressive detail.** Dashboard card -> tap -> detailed chart with date range selector -> tap data point -> individual reading with context.
3. **Bar-style date selector.** Easily switch between Day/Week/Month/Year. Charts update dynamically.
4. **Whitespace as a tool.** Generous whitespace within cards, consistent gutters between cards. Reduces cognitive load in data-heavy views.
5. **Highlights/Summaries.** The Summary view surfaces what matters: trends, alerts, notable changes. Not a data dump.

### Typography
- **SF Pro** (system font) throughout
- Large, bold metric values (the number is the hero)
- Small, gray labels beneath
- Consistent type scale across all health categories

### What Makes Medical Data Trustworthy
- Reference ranges always visible (not just the value, but the context)
- Units always displayed
- Source attribution (which device/app provided the data)
- Clean, clinical aesthetic -- no playful design in data areas
- Trend arrows/sparklines for temporal context

### MedPanel Takeaways
- Use the reference range bar pattern for lab values and biomarker data
- Color-code by medical domain (cardiology=red, nephrology=purple, etc.)
- Card-based dashboard with sparkline trends
- Progressive disclosure: summary -> chart -> detail
- Make the number the hero (large, bold), context secondary (small, gray)

---

## 6. Bloomberg Terminal (Maximum Information Density)

### Information Density Strategy

**The Bloomberg paradox:** Maximum density, maximum usability -- but only for trained users.

**Layout structure:**
- Tabbed panel model: users customize their workspace with arbitrary numbers of tabs/windows
- Each panel is a self-contained data view (chart, table, news feed, analytics)
- Single screen shows: scrolling sparklines of indices, trading volume tables (dozens of rows/columns), scrolling headlines, UI signposts with keyboard shortcuts

**Key density techniques:**
1. **Tabular alignment.** Custom font with tabular figures ensures columns of numbers align perfectly.
2. **Color as data.** Color carries meaning, never decoration: green=up, red=down, amber=alert, white=neutral text, orange=interactive/commands.
3. **No chrome.** Minimal UI decoration. Every pixel is either data or navigation.
4. **Keyboard shortcuts as primary navigation.** Function keys, command codes (type "AAPL <Equity> GO" to navigate). Trained users are faster than any mouse-based UI.

### Color System

| Color | Hex | Meaning |
|-------|-----|---------|
| Black | #000000 | Background |
| Amber/Orange | #FFA028 / #FB8B1E | Interactive elements, commands, branding |
| Green | (varies) | Positive movement, up |
| Red | #FF433D | Negative movement, down |
| Blue | #0068FF | Links, secondary interactive |
| Teal | #4AF6C3 | Highlighting, accents |
| White | #FFFFFF | Primary text, data |

### Typography
- **Custom Bloomberg Terminal font** by Matthew Carter (based on Georgia)
- Optimized for: dense numerical data, screen legibility, tabular alignment
- Special glyphs for financial fractions (1/64th granularity)
- Slightly condensed proportions for density
- Clear numeral shapes, distinct punctuation

### Real-Time Data Updates
- Near-zero latency loading (the "superpower")
- Data updates in-place without page refresh
- Streaming values change color momentarily on update (flash green/red)
- No loading states visible -- data is always "live"

### Accessibility Evolution
- New color frameworks for Color Vision Deficiency (CVD) support (rolled out 2025)
- Alternate color schemes for Deuteranopia and Protanomaly
- Users can switch via PDFU COLORS <GO> command

### What Builds Professional Trust
- **Density = expertise.** The density itself signals "this is a professional tool." Sparse interfaces feel consumer-grade to power users.
- **Speed.** Instant navigation between views. No animations, no transitions. Speed IS the UX.
- **Consistency.** Every screen follows the same layout grammar. Learn once, navigate everywhere.
- **The amber-on-black identity.** Instantly recognizable. The color scheme IS the brand.

### MedPanel Takeaways
- For Physician Mode: increase information density significantly over Patient Mode
- Use color semantically (not decoratively): green=normal, amber=attention, red=critical
- Tabular number alignment with monospace/tabular figures for lab values
- Consider a "flash" animation when data updates in real-time
- Density signals professionalism -- don't over-simplify the physician view

---

## Synthesis: TOP 10 Design Patterns for MedPanel

### 1. Summary-First, Depth-on-Demand (from UpToDate)

**Pattern:** Every consultation result opens with a "Summary and Key Perspectives" panel at the top. The full multi-specialist discussion lives below, navigable via a left-rail outline.

**Implementation:**
- Fixed/sticky summary card at top of results (200-300px height)
- Collapsible left-rail navigation with sections: Summary, [Each Specialist], Evidence Landscape, Questions for Your Doctor, Full Discussion, References
- "Jump to section" click targets in the outline
- Summary contains the GRADE-style evidence badges inline

### 2. Sentence-Level Citations on Every AI Claim (from Elicit)

**Pattern:** Every sentence the AI generates has a clickable citation linking to the exact source passage.

**Implementation:**
- Superscript citation numbers after every claim: "Metformin reduces HbA1c by 1-1.5%[1]"
- Click [1] -> slide-out panel showing: paper title, authors, journal, year, PMID, and the EXACT QUOTE highlighted in context
- This is the single highest-trust pattern available for AI-generated medical content
- Store citations as structured data: `{ pmid, quote, page, section }`

### 3. Progressive Streaming Construction (from Elicit)

**Pattern:** Results build progressively on screen. Skeleton first, content fills in as each specialist agent completes.

**Implementation:**
- On submission: immediately show skeleton layout with specialist cards (empty but structurally correct)
- Each specialist card fills in as that agent completes (1-15 seconds each)
- Use subtle static placeholders (light gray text blocks), NOT spinners
- Keep the page interactive during loading -- users can read completed sections while others load
- Show a discrete progress indicator: "4 of 6 specialists have responded"

### 4. Two-Axis Evidence Badges (from UpToDate)

**Pattern:** Every recommendation/perspective carries an inline badge combining recommendation strength and evidence quality.

**Implementation for MedPanel:**
- **Strength axis:** "Strong perspective" vs "Exploratory perspective" (avoids clinical recommendation language)
- **Quality axis:** A (systematic reviews/meta-analyses), B (RCTs), C (observational/preliminary)
- Display as inline pills: `[Strong | A]` `[Exploratory | C]`
- Color: A = deep blue, B = medium blue, C = gray-blue (monochromatic scale, not traffic lights)
- Each badge clickable -> tooltip explaining what the grade means

### 5. LCH-Based Dark Mode with Semantic Color (from Linear + Bloomberg + Arc)

**Pattern:** Premium dark mode using perceptually uniform color space with medical-semantic color meanings.

**Implementation:**
- **Background:** #0D0D12 (near-black with cool undertone)
- **Surface (cards):** #1A1A22 (2-4% lighter in LCH)
- **Elevated surface (modals):** #232330
- **Borders:** 1px rgba(255,255,255,0.08)
- **Primary text:** #E8E8ED
- **Secondary text:** #8B8B96
- **Semantic colors (dark mode, desaturated):**
  - Normal/safe: #2D8A56 (muted green)
  - Attention/review: #C4842D (muted amber)
  - Critical/urgent: #CC4444 (muted red)
  - Cardiology accent: #CC5555
  - Endocrinology accent: #55AACC
  - Nephrology accent: #8855CC
  - Pharmacology accent: #55CC88
- **Typography:** Inter (body), Inter Display (headings)
- **Border-radius:** 6px for cards, 4px for buttons, 8px for modals

### 6. Reference Range Bars for Biomarkers (from Apple Health)

**Pattern:** Visual bar showing normal range with a dot for the patient's value.

**Implementation:**
- Horizontal bar (120-200px wide, 8px tall) representing the reference range
- Bar colored green for normal range
- Patient value shown as a 12px dot positioned on the bar
- In-range: green dot inside green bar
- Out-of-range: orange dot positioned outside bar, with bar still visible
- Numeric value displayed to the right of the bar
- Units always visible
- Use for: lab values, vitals, biomarker references mentioned in consultations

### 7. Cmd+K Command Palette (from Linear)

**Pattern:** Universal keyboard command palette for power-user navigation.

**Implementation:**
- Cmd+K (Mac) / Ctrl+K (Windows) opens command palette
- Fuzzy search across: past consultations, specialist sections, evidence sources, settings
- Categorized results: "Consultations", "Evidence", "Profile", "Settings"
- Keyboard navigation (arrow keys + Enter)
- Recent items shown by default before typing
- For Physician Mode users: add medical shorthand search (type "HbA1c" -> jumps to relevant evidence)

### 8. Dual-Density Modes (from Bloomberg + Apple Health)

**Pattern:** Physician Mode shows Bloomberg-level density. Patient Mode shows Apple Health-level clarity.

**Implementation -- Patient Mode:**
- Card-based layout with generous whitespace (24px gutters)
- One concept per card
- Large metric values (24-32px), small labels (12-14px)
- Sparkline trends where data exists
- Reading level: 5th-6th grade
- Progressive disclosure (summary -> detail on tap/click)

**Implementation -- Physician Mode:**
- Tabular layout with compact spacing (8-12px gutters)
- Multiple data points per row
- Tabular/monospace figures for lab values (font-variant-numeric: tabular-nums)
- GRADE badges, PMID links, NNT/NNH values inline
- Named guidelines with society + year
- Side-by-side specialist panels (not stacked cards)
- Higher information density signals "this is a professional tool"

### 9. Specialist-Colored Panel Accents (from Arc + Apple Health)

**Pattern:** Each specialist in the panel gets a subtle color accent, creating visual identity without overwhelming.

**Implementation:**
- Left border (3px) on each specialist card in their accent color
- Specialist avatar/icon uses the accent color
- In dark mode, the accent appears as a very subtle background tint (2-3% opacity overlay)
- Colors map to medical domains (matching Apple Health's category logic):
  - Cardiologist: warm red (#E85D5D)
  - Endocrinologist: teal (#4DBBAA)
  - Nephrologist: purple (#8B6FC0)
  - Neuropsychiatrist: deep blue (#5B7FCC)
  - Pharmacologist: green (#5BAA6E)
  - Functional Medicine: amber (#CCA044)
  - Moderator: neutral gray (#8B8B96)
- Subtle enough that the page doesn't look like a rainbow -- the content is still king

### 10. Instant Verification Architecture (from Elicit + UpToDate + Bloomberg)

**Pattern:** Any claim can be verified in under 3 seconds. Trust comes from verifiability, not assertion.

**Implementation:**
- Every evidence claim has a clickable source indicator
- Click -> slide-out verification panel (right side, 400px wide) showing:
  - Paper title, authors, journal, year
  - PMID with direct PubMed link
  - The exact quote, highlighted
  - Study type badge (meta-analysis, RCT, cohort, case report)
  - Sample size where applicable
- Panel stays open while user scrolls main content (like UpToDate's outline)
- Keyboard shortcut to close: Esc
- For Bloomberg-style speed: pre-fetch citation data so panels open instantly (no loading state)

---

## Implementation Priority

| Priority | Pattern | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Summary-first layout | Medium | Critical -- defines the product |
| P0 | Sentence-level citations | High | Critical -- the trust foundation |
| P0 | Two-axis evidence badges | Low | Critical -- evidence credibility |
| P1 | Progressive streaming | Medium | High -- perceived performance |
| P1 | Dark mode (LCH-based) | Medium | High -- premium feel |
| P1 | Dual-density modes | Medium | High -- serves both audiences |
| P2 | Reference range bars | Low | Medium -- for biomarker data |
| P2 | Specialist color accents | Low | Medium -- visual identity |
| P2 | Cmd+K command palette | Medium | Medium -- power user retention |
| P3 | Instant verification panel | High | High -- but builds on P0 citations |

---

## Sources

- [UpToDate Clinical Decision Support](https://www.wolterskluwer.com/en/solutions/uptodate/clinical-decision-support)
- [UpToDate Grading Guide](https://www.wolterskluwer.com/en/solutions/uptodate/policies-legal/grading-guide)
- [UpToDate Topic Outlines Navigation](https://wkhealthce.my.site.com/customers/s/article/How-do-I-use-topic-outlines)
- [Elicit: AI for Scientific Research](https://elicit.com/)
- [Elicit: Living Documents as a UX Pattern in AI](https://elicit.com/blog/living-documents-ai-ux/)
- [Elicit Sentence-Level Citations](https://support.elicit.com/en/articles/1418881)
- [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear Design: The SaaS Trend (LogRocket)](https://blog.logrocket.com/ux-design/linear-design/)
- [Linear Brand Guidelines](https://linear.app/brand)
- [Linear Style (Theme Gallery)](https://linear.style/)
- [Linear Design Tokens](https://fontofweb.com/tokens/linear.app)
- [Arc Browser Spaces](https://resources.arc.net/hc/en-us/articles/19228064149143-Spaces-Distinct-Browsing-Areas)
- [Arc CSS Custom Properties for Theming](https://ginger.wtf/posts/creating-a-theme-using-arc/)
- [Arc Theme Analysis](https://alexanderliu.com/post/arc-theme)
- [Apple Health HealthKit Guidelines](https://developer.apple.com/design/human-interface-guidelines/healthkit)
- [Apple Health Redesign Case Study](https://medium.com/@cudzinovicam/apple-health-redesign-ui-ux-case-study-65401f78e0e9)
- [Bloomberg Terminal Color Accessibility](https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/)
- [Bloomberg Terminal UX: Concealing Complexity](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/)
- [Bloomberg Terminal Color Palette](https://www.color-hex.com/color-palette/111776)
- [Dark Mode Color Palettes 2025](https://colorhero.io/blog/dark-mode-color-palettes-2025)
- [Designing Trust: UX Patterns for Medical Apps](https://www.diversido.io/blog/which-interface-design-solutions-should-you-consider-for-your-medical-app)
- [Healthcare UI Design 2026](https://www.eleken.co/blog-posts/user-interface-design-for-healthcare-applications)
