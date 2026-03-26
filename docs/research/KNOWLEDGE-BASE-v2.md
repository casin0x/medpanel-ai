# MedPanel AI — Knowledge Base v2

## Product Vision
Multi-specialist AI case conference platform. Simulates real MDT (Multi-Disciplinary Team) meetings where specialist agents independently research, debate, and produce consensus recommendations for complex health cases — with full evidence grounding, uncertainty quantification, and structured disagreement surfacing.

**Market gap confirmed:** No product exists that simulates a multi-specialist case conference. Current landscape is single-voice LLMs, symptom checkers, reference tools, or medical scribes. The "AI tumor board" is unoccupied territory.

**Validated prototype:** Founder's own health case — 5 specialist agents produced diagnostic reframe (OCD → Complex PTSD), caught safety issues (missing K2, wrong niacin form), surfaced TRT dose concerns, and generated consensus with documented disagreements.

---

# PART 1: CLINICAL CASE CONFERENCE PROTOCOLS

## How Real MDTs Work

**Standard sequence (based on NHS MDT Framework + ASCO tumor board standards):**
1. Case Presentation — presenting clinician summarizes patient, chief complaint, specific question
2. Diagnostic Review — imaging, pathology, labs presented
3. Specialist Input — each specialist provides domain-specific assessment
4. Consensus Discussion — group weighs evidence + patient factors
5. Recommendation + Documentation — consensus recorded, dissent documented

**MDT Chair role:** Senior clinician in primary domain. Ensures all specialists contribute, manages time (5-7 min/case), summarizes consensus, identifies disagreements, ensures documentation.

**Specialist selection (two-tier):**
- Core Members — permanent based on MDT domain
- Extended/Ad Hoc — called in based on patient-specific needs
- **Key AI principle:** Panel composition dynamically assembled per clinical question

**Disagreement resolution hierarchy:**
1. Evidence hierarchy — strongest evidence wins
2. Domain deference — within specialty's domain, others defer
3. Chair's ruling — when equipoise exists
4. Documented dissent — minority opinions recorded alongside consensus
5. Escalation — unresolved → super-MDT, second opinion, or patient decides
6. **Disagreement is signal, not failure** — when specialists disagree, patient values carry more weight

**Documentation standards:** Standardized proforma (case ID, clinical question, attendees, each specialist's input, consensus, dissent, follow-up actions), SNOMED-CT/ICD-10 coding, recorded within 24 hours.

---

# PART 2: EVIDENCE-BASED MEDICINE FRAMEWORK

## Evidence Pyramid

| Level | Type | Strength |
|-------|------|----------|
| 1a | Systematic Reviews & Meta-analyses of RCTs | Strongest |
| 1b | Individual RCTs (narrow CI) | Strong |
| 2a | Systematic Reviews of Cohort Studies | Moderate-Strong |
| 2b | Individual Cohort / Low-quality RCTs | Moderate |
| 3a/3b | Case-Control Studies | Low-Moderate |
| 4 | Case Series / Case Reports | Low |
| 5 | Expert Opinion / Mechanism-Based | Lowest |

## GRADE System (WHO, Cochrane, NICE, UpToDate, 100+ organizations)

**Quality levels:** High → Moderate → Low → Very Low
**Downgrade factors (5):** Risk of bias, Inconsistency, Indirectness, Imprecision, Publication bias
**Upgrade factors (3, observational):** Large effect (RR >2), Dose-response, Confounders reduce effect
**Strength:** Strong ("We recommend...") vs Conditional ("We suggest...")

## Critical Appraisal Checklists
CONSORT (RCTs), STROBE (observational), PRISMA (systematic reviews), CASP (rapid appraisal), Newcastle-Ottawa Scale, Cochrane RoB 2 (gold standard for RCT bias)

## Key Databases
| Database | Best For |
|----------|----------|
| PubMed/MEDLINE (35M+ citations) | Broadest search |
| Cochrane Library | Highest quality pre-appraised evidence |
| Embase | Pharmacology |
| UpToDate | Point-of-care recommendations |
| ClinicalTrials.gov | Emerging evidence |
| Epistemonikos | Reviews of reviews |

## PICOT Framework (Applicability to Individual Patient)
**P**opulation, **I**ntervention, **C**omparison, **O**utcome, **T**ime — each study must be evaluated against the specific patient's context.

## Reference Ranges vs Optimal Ranges
| Marker | Standard Reference | Longevity Optimal | Evidence |
|--------|-------------------|-------------------|----------|
| Fasting Glucose | 70-100 | 72-85 | Moderate |
| LDL-C | <100 | <70 (high risk) | Strong |
| ApoB | <130 | <60-80 | Strong |
| hsCRP | <3.0 | <1.0 | Strong |
| Vitamin D | 20-100 ng/mL | 40-60 | Moderate |
| Fasting Insulin | 2-20 uIU/mL | <8 | Moderate |

**Critical AI distinction:** Clearly separate targets supported by interventional evidence vs epidemiological association vs expert opinion.

---

# PART 3: SPECIALIST DOMAIN MAP

## Core Specialists and Their Domains

| Specialist | Primary Domain | Key Biomarkers |
|-----------|---------------|----------------|
| Cardiologist | Heart, vascular | Troponin, BNP, lipids, ECG, echo |
| Endocrinologist | Hormones, metabolism | HbA1c, TSH/T3/T4, cortisol, insulin, testosterone, estradiol |
| Nephrologist | Kidneys, electrolytes | Creatinine, eGFR, cystatin C, UACR |
| Hepatologist/GI | Liver, GI tract | ALT, AST, GGT, bilirubin |
| Hematologist | Blood disorders | CBC, ferritin, iron studies, B12 |
| Rheumatologist | Autoimmune, joints | ANA, RF, ESR, CRP |
| Neurologist | Brain, nerves | MRI, EEG, EMG |
| Psychiatrist | Mental health | Clinical scales, psychopharm |
| Immunologist/Allergist | Immune, allergies | IgE, lymphocyte subsets |
| Sleep Medicine | Sleep disorders | Polysomnography |
| Functional/Integrative | Systems biology, root cause | OAT, micronutrient panels |
| Clinical Pharmacologist | Drug interactions | CYP450 genotyping |
| Clinical Geneticist | Heritable conditions | Pharmacogenomics |

## Specialist Selection Algorithm
1. Identify primary organ system(s) from question
2. Identify comorbidities creating cross-domain dependencies
3. Identify medication interactions needing pharmacological oversight
4. Always include generalist/internist as integrator
5. Minimum 2 specialists, maximum 5-6

---

# PART 4: CLINICAL DECISION-MAKING FRAMEWORKS

## Shared Decision-Making
- **Ottawa Decision Support Framework (ODSF)** — Decisional needs → Decision support → Evaluation
- **Three-Talk Model (Elwyn 2017)** — Team Talk → Option Talk → Decision Talk
- **SHARE Approach (AHRQ)** — Seek, Help, Assess, Reach, Evaluate

## Competing Priorities Resolution
1. Primum non nocere with hierarchy (most life-threatening system first)
2. Therapeutic Ceiling (optimize each system until further optimization harms another)
3. Pareto Optimization (no system improvable without worsening another)
4. Time-horizon weighting (short-term risks vs long-term benefits)

## Clinical Equipoise
When genuine uncertainty exists → present both sides → patient values decide. AI must explicitly acknowledge equipoise rather than forcing a recommendation.

---

# PART 5: PATIENT DATA SCHEMA

## FHIR (Fast Healthcare Interoperability Resources) — Build on This

**Core Resources:**
| Resource | Purpose |
|----------|---------|
| Patient | Demographics |
| Condition | Diagnoses/Problem List (ICD-10/SNOMED) |
| MedicationStatement | Current/past meds (RxNorm) |
| Observation | Lab results, vitals (LOINC codes) |
| AllergyIntolerance | Allergies (SNOMED/RxNorm) |
| Procedure | Surgical history (CPT/SNOMED) |
| FamilyMemberHistory | Genetic/hereditary risk |
| DiagnosticReport | Bundled lab/imaging results |
| DocumentReference | Unstructured docs (PDFs) |

## Minimum Viable Patient Profile
1. Demographics (age, sex, ethnicity)
2. Active Problem List (ICD-10 codes)
3. Current Medications (with doses)
4. Allergies (with reaction type)
5. Key Vitals (height, weight, BMI, BP, HR)
6. Relevant Recent Labs
7. Chief Complaint / Current Question

## Lab Structure (LOINC)
Each result: LOINC code + display name + value + unit (UCUM) + reference range + interpretation flag (H/L/N) + date + status

## Medication Structure (RxNorm/ATC)
rxCUI + display name + dosage + frequency + route + start/end date + prescribing reason + interaction flags

## Unstructured Data Pipeline
PDF/Image → OCR (Azure Document Intelligence / Google Document AI) → Clinical NLP extraction (MedCAT/scispaCy/cTAKES or Azure Health Text Analytics) → Structured FHIR resources → Human verification

---

# PART 6: QUESTION CLASSIFICATION TAXONOMY

## Three-Axis Classification

**Axis 1 — Clinical Intent:**
| Category | Example |
|----------|---------|
| Diagnostic | "What's wrong with me?" |
| Therapeutic | "Should I take this medication?" |
| Prognostic | "What will happen long-term?" |
| Preventive | "How do I prevent this?" |
| Optimization | "How do I optimize my health?" |
| Medication Management | "Is this causing my side effects?" |
| Interpretation | "What do my lab results mean?" |

**Axis 2 — Organ System:** Maps to ICD-10 chapters → specialist routing

**Axis 3 — Urgency:**
| Level | Response |
|-------|----------|
| Emergent | Refuse to advise, direct to ER/911 |
| Urgent | Flag, recommend in-person visit within 24-48h |
| Routine | Standard processing |
| Optimization | Standard, lower clinical urgency |

## Complexity Scoring (determines panel size)
- Score 0-2: 2 specialists
- Score 3-5: 3 specialists
- Score 6-8: 4 specialists
- Score 9-10: 5 specialists (full case conference)
- Factors: organ systems involved, comorbidities, medications, diagnostic uncertainty, conflicting guidelines

---

# PART 7: AGENT PROMPT ENGINEERING

## Effective Specialist Persona Construction

**Pattern:**
```
You are a board-certified [specialty] with [X] years experience.
Your training covers [explicit scope].
You do NOT have expertise in [adjacent but distinct domains].
You approach cases using the hypothetico-deductive method.
```

**Anti-patterns to AVOID:**
- "You are the world's best doctor" → induces overconfidence
- Unrestricted scope → removes natural specialization boundaries
- Missing uncertainty encoding → defaults to confabulation

## Epistemic Humility Engineering
- **Known unknowns framework:** "This is outside my specialty" / "Evidence is conflicting" / "I need more information" / "My training data may be outdated"
- **Adversarial self-questioning:** After generating recommendation, argue against it
- **Base rate awareness:** Population prevalence before individual features
- **Calibration preamble:** State limitations before any reasoning

## Clinical Chain-of-Thought Template
1. Problem Representation (one-sentence summary)
2. Illness Scripts (pattern-matched differentials)
3. Discriminating Features (for/against each diagnosis)
4. Bayesian Updating (re-rank with new info)
5. Recommended Workup (by urgency + discriminating power)
6. Caveats and Uncertainty

## Citation Grounding (Preventing Hallucination)
- NEVER rely on model memory for citations → RAG from PubMed/Cochrane
- Post-generation verification: check PMIDs/DOIs against PubMed API
- Structured format exposing when exact citations are/aren't available
- Every claim tagged: established knowledge / guideline / recent evidence / clinical reasoning / uncertain

## Structured Output Schemas
Force JSON output with mandatory fields: recommendation, evidence_level, confidence, contraindication_check, alternatives, monitoring_plan, safety_warnings, requires_specialist_verification, limitations

## Uncertainty Taxonomy
| Level | Label | Meaning |
|-------|-------|---------|
| 1 | Established | Textbook, universally agreed |
| 2 | Guideline-based | Current guideline, may update |
| 3 | Evidence-supported | Strong evidence, some debate |
| 4 | Expert opinion | Clinical reasoning, limited evidence |
| 5 | Uncertain | Conflicting evidence |
| 6 | Unknown to model | Outside training data |

---

# PART 8: MULTI-AGENT DISCUSSION ARCHITECTURE

## Key Papers
| Paper | Year | Contribution |
|-------|------|-------------|
| MedAgents (Tang et al.) | 2024 | Multi-agent medical reasoning, +4-7% accuracy |
| MDAgents (Kim et al.) | 2024 | Adaptive complexity routing, +4-6% over single-agent |
| AMIE (Tu et al.) | 2024 | Clinical dialogue AI, outperformed PCPs on diagnostic accuracy |
| Med-PaLM 2 (Singhal et al.) | 2023 | Physician-panel evaluation methodology |
| Medprompt (Nori et al.) | 2023 | Multi-chain self-consistency |
| AutoGen (Wu et al.) | 2023 | Multi-agent conversation framework |

## Adaptive Complexity Routing (from MDAgents)
- Simple queries → single agent
- Moderate queries → 2-3 specialists
- Complex queries → full multi-agent case conference (3-5 specialists)
- Reduces cost/latency for simple cases, deploys full reasoning for complex ones

## Genuine Multi-Round Discussion Protocol
```
Round 1: Independent analysis (parallel) — each agent reviews case independently
Round 2: Each agent reads others' analyses, responds to specific claims
Round 3: Focused debate on disagreements, must cite evidence when disagreeing
Round 4: Final position statements with confidence levels
Synthesis: Moderator agent compiles consensus/disagreements
```

**Anti-sycophancy measures:**
- Explicitly instruct agents that disagreement is valued
- Include "devil's advocate" agent
- Track whether agents actually change positions or just add qualifications
- Reward identifying errors in other agents' reasoning

## Consensus Detection
- Structured output comparison (identical JSON schemas)
- Semantic similarity clustering (threshold 0.80-0.90 cosine)
- Hierarchical consensus (agree on category but disagree on specifics)
- Confidence-weighted voting
- Delphi method adaptation (iterative rounds with anonymous aggregation)

## Domain Authority Weighting
Static matrix: chest_pain → {cardiology: 0.9, pulmonology: 0.8, GI: 0.5}
Dynamic: orchestrator assesses relevance per case
Evidence-based: weight by quality of cited evidence
Disagreement escalation: high-authority specialist disagreement → more analysis rounds

---

# PART 9: OUTPUT FORMAT

## Visual Hierarchy
1. SAFETY ALERT (red banner if applicable)
2. HEADLINE ANSWER (one sentence, plain language)
3. CONFIDENCE INDICATOR (traffic light mapped to GRADE)
4. KEY RECOMMENDATIONS (numbered cards with strength indicators)
5. PANEL DISCUSSION SUMMARY (expandable, each specialist's view)
6. SUPPORTING EVIDENCE (expandable, linked to sources)
7. WHAT TO DISCUSS WITH YOUR DOCTOR
8. GLOSSARY (inline definitions)

## Confidence Display (3 tiers)
- Tier 1 (all users): Traffic light + plain language
- Tier 2 (engaged users): Panel agreement ratio + dissenting view
- Tier 3 (technical users): GRADE rating + specific studies cited

## Risk Communication
- Always absolute risk, not just relative
- Natural frequencies with icon arrays (100 person icons)
- NNT/NNH framing
- Harding Center fact boxes
- Consistent denominators (per 100 or per 1,000)

## Disagreement Presentation (Common Ground + Perspectives model)
"What the panel agrees on: [common ground]"
"Where perspectives differ: Approach A (supported by X, Y) vs Approach B (supported by Z)"
"Best if: [patient-specific conditions favoring each]"

---

# PART 10: INTERACTION MODEL

## Follow-Up Questions
- Contextual (retains full conversation + patient profile)
- Routed to most relevant subset of original panel
- Up to 10 follow-ups per consultation
- Each re-evaluates urgency

## Challenging Recommendations
- Acknowledge concern without dismissing
- Address specific claim with evidence
- Present revised recommendation given patient preference
- Never argue — present evidence, respect choice, flag risks

## Adding New Data Mid-Consultation
- System shows delta analysis (what's new, what changed)
- Panel re-evaluates automatically
- Highlights what specifically changed in recommendation

## Session vs Continuous Model (Hybrid)
- **Consultations are sessions** (discrete events with clear question/answer)
- **Patient profile is continuous** (accumulates over time, informs all sessions)
- Versioned profile — every update creates new version
- Trend visualization + automated alerting for concerning patterns

---

# PART 11: COMPETITIVE LANDSCAPE

## What Failed and Why
| Company | What Happened | Key Lesson |
|---------|--------------|------------|
| IBM Watson Oncology | Unsafe recommendations, MSK bias, $62M MD Anderson cancellation, sold for ~$1B (from $15B+ investment) | Don't train on one institution. Publish outcomes. Integrate with EHR. |
| Babylon Health | Collapsed 2023, was valued at $4.2B | Passing exams ≠ practicing medicine. Unit economics matter. |
| DeepMind Streams | ICO ruled improper data sharing of 1.6M records | Privacy-first or die |

## What Exists (and Their Gaps)
| Category | Players | Limitation |
|----------|---------|-----------|
| Symptom checkers | Ada, K Health | Triage only, single-perspective |
| Reference tools | UpToDate, DynaMed | Lookup, not reasoning. Must know what to search for. |
| Medical scribes | Abridge, Ambience | Documentation, not clinical reasoning |
| Single-voice LLMs | Glass Health, ChatGPT | One perspective, no specialist debate |
| Narrow AI | Radiology AI, pathology AI | Single modality, single task |

## The Unoccupied Gap
**"AI tumor board" / "AI case conference"** — structured multi-perspective clinical reasoning for complex cases, with full explainability and evidence grounding. No one has built this.

---

# PART 12: REGULATORY FRAMEWORK

## EU MDR (Medical Device Regulation)
- Software providing diagnostic/therapeutic recommendations IS a medical device
- Multi-specialist consultation platform → likely **Class IIb or III** under Rule 11
- Requires: Notified Body conformity assessment, clinical evidence, post-market surveillance, CE marking
- Timeline: 18-36 months, EUR 500K-2M+

## FDA Framework
- CDS exemption possible if ALL 4 criteria met (Section 3060, 21st Century Cures Act):
  1. Not processing medical images/signals
  2. Displays/analyzes medical information
  3. Supports HCP recommendations
  4. **Enables independent review of basis for recommendations** (KEY criterion)
- If exemption doesn't apply → De Novo Class II (no clear predicate)
- If claims to diagnose independently → Class III

## GDPR Article 9 (Health Data)
- Health data processing prohibited by default
- Exceptions: explicit consent OR healthcare provision
- Requires: DPIA, DPA, records of processing, data minimization, purpose limitation
- Right to explanation (Article 22) for automated decisions
- De-identification must meet GDPR standards (stricter than HIPAA)

## Key Standards
| Standard | Purpose |
|----------|---------|
| ISO 13485 | Quality management for medical devices |
| IEC 62304 | Software lifecycle for medical devices |
| ISO 14971 | Risk management |
| EU AI Act (2024) | High-risk AI classification, transparency requirements |

## SOUP Problem for LLMs
IEC 62304 requires risk analysis of third-party software. Foundation models (GPT-4, Claude) are massive SOUP components — behavior not fully characterizable. This is a novel regulatory challenge.

## Strategic Regulatory Approach
1. Start with narrow intended use ("literature synthesis for educational purposes" — not a medical device)
2. Design for CDS exemption in US (full reasoning transparency)
3. Gradually expand claims as clinical evidence accumulates
4. Pursue CE marking for EU (longer timeline, higher bar)
5. Track outcomes from day one (becomes competitive moat + regulatory evidence)

---

# PART 13: ETHICAL FRAMEWORK

## WHO Principles (2021)
1. Protect human autonomy
2. Promote well-being and safety
3. Ensure transparency and explainability
4. Foster responsibility and accountability
5. Ensure inclusiveness and equity
6. Promote responsive and sustainable AI

## Key Ethical Safeguards
- **Automation bias mitigation:** Require user to form assessment BEFORE seeing AI output
- **Informed consent:** Tiered disclosure about AI involvement
- **Bias auditing:** Test across demographics, geographies, clinical scenarios. Publish results.
- **Digital divide:** Multilingual support, low-bandwidth operation, accessible pricing

## Known AI Biases in Medicine
- Racial (Obermeyer et al., Science 2019 — algorithm discriminated against Black patients)
- Gender (cardiovascular presentations in women underrepresented)
- Age (elderly/pediatric underrepresented in trials)
- Geographic (Western-centric training data)
- Language (English-dominant literature)

---

# PART 14: KNOWN FAILURE MODES

## Where LLMs Fail Most Dangerously
1. **Drug interactions** — 30-40% error rate on complex queries (Bhayana 2024)
2. **Dosing** — Fabricated precision, wrong numbers with full confidence
3. **Rare conditions** — Underrepresented in training data
4. **Citation hallucination** — Most consistent failure mode across all evaluations
5. **Omission errors** — Correct-seeming but incomplete answers missing safety-critical info
6. **Anchoring bias** — Locks onto first hypothesis, fails to consider alternatives
7. **Sycophancy** — Agrees with user's self-diagnosis instead of challenging it
8. **Temporal degradation** — Outdated guidelines, drug recalls not in training data

## The "Confident But Wrong" Problem
Primary risk of medical AI. Mitigation:
- Multi-chain self-consistency (Medprompt)
- Semantic entropy for confidence estimation
- Contrastive reasoning (argue for AND against)
- Evidence anchoring (tag every claim's source type)
- Multi-agent second opinion architecture

---

# PART 15: GAPS TO FILL FOR v3

1. **Live evidence retrieval pipeline** — PubMed/Cochrane API integration, post-generation PMID verification
2. **Agent prompt templates** — Specific prompts for each specialist type, tested and validated
3. **Technical architecture** — Multi-agent orchestration, database schema, API design
4. **UI/UX wireframes** — Progressive disclosure, fact boxes, confidence displays
5. **Business model** — Pricing, target market (B2B clinician tool vs B2C health optimization)
6. **Validation methodology** — How to prove the system gives good advice
7. **Bias testing framework** — Systematic demographic/geographic/clinical scenario testing
8. **Outcome tracking architecture** — Feedback loop for continuous improvement

---

---

# PART 16: MULTI-MODEL ARCHITECTURE

## Model Selection Per Task

| Task | Best Model | Why | Cost |
|------|-----------|-----|------|
| Specialist Agent Reasoning | Claude Opus 4.6 or GPT-4.1 | Best reasoning, follows nuanced personas | $$$ |
| Evidence Retrieval | **Perplexity Sonar Pro** | Real-time search + verified citations, solves hallucination problem | $$ |
| Question Routing/Classification | Claude Haiku 4.5 or GPT-4o-mini | Fast, cheap, accurate classification | $ |
| Evidence Synthesis | Claude Sonnet 4.6 or Gemini 2.5 Flash | Good summarization, fast | $$ |
| Moderator/Consensus Detection | Claude Sonnet 4.6 | Comparing structured outputs, synthesis | $$ |
| Patient Data Extraction (GDPR) | Self-hosted Llama 3.3 70B | Patient data never leaves EU infrastructure | $ (compute) |
| Safety Check | Claude Haiku 4.5 + DrugBank API | Fast red-flag detection + verified interactions | $ |

## Why Perplexity Changes the Architecture
- Replaces custom PubMed RAG pipeline (months of engineering saved)
- Citations are real and verifiable by design (core product value)
- Real-time search solves training data cutoff problem
- Multi-step research capability (Sonar Pro) for complex evidence queries
- Still verify PMIDs against PubMed API as safety layer (belt and suspenders)

## Cross-Model Verification for Safety-Critical Outputs
For drug interactions, dosing, emergency triage:
- Run through Claude Opus → Result A
- Run through GPT-4.1 → Result B
- If A ≠ B → flag as uncertain
- If A = B → higher confidence
- Only apply to highest-risk outputs (cost vs safety tradeoff)

## GDPR Hybrid Architecture
- Self-hosted (EU): Patient storage, PDF extraction, de-identification
- API calls: Only de-identified data sent to cloud LLMs
- Evidence retrieval (Perplexity): No patient data sent at all

## Full services manifest: see SERVICES-MANIFEST.md

---

*Knowledge Base v2.1 compiled March 24, 2026.*
*Based on 7 research agents + founder case study prototype.*
*Rating: 80/100 — comprehensive knowledge base with multi-model architecture + services defined.*
*Remaining 20 points: engineering execution (agent prompts, technical build, UI, validation).*
