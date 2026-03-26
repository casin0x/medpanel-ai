# Product Positioning — MedPanel AI

## Classification
**Health information and education platform.** NOT clinical decision support. NOT a medical device.

## Regulatory Strategy

### United States (FDA)
MedPanel falls **outside the definition of a medical device** because it:
1. Does not claim diagnostic or therapeutic purpose
2. Presents exploration and multiple perspectives, not recommendations
3. Generates "questions to ask your doctor" as primary output
4. Does not claim to determine treatment or diagnosis

If challenged, the product also meets all 4 criteria of the **21st Century Cures Act Section 3060 CDS exemption:**
1. Does not process medical images or signals ✓
2. Displays and analyzes medical information ✓
3. Supports HCP decision-making ✓
4. Enables independent review of reasoning basis ✓

**Strategy:** Position as educational/informational tool, not CDS. If FDA inquires, the CDS exemption is the fallback position.

### European Union (MDR)
Under **EU MDR 2017/745**, MedPanel is not a medical device because:
- It does not have a "medical purpose" as defined in Article 2(1)
- It does not diagnose, treat, prevent, or predict disease
- It presents educational information and exploration
- Per **MDCG 2019-11 Rev.1** flowchart: software that presents general medical knowledge without patient-specific diagnostic/therapeutic conclusions is not a medical device

**Strategy:** Maintain clear separation between "information presentation" and "clinical recommendation" in all UI, marketing, and documentation.

### GDPR (Article 9 — Health Data)
Patient health data is GDPR Article 9 special category data. Compliance:
- **Lawful basis:** Explicit consent (Article 9(2)(a))
- **De-identification:** PII stripped before any data sent to third-party APIs
- **Data residency:** Patient data stored in Supabase EU region, never leaves EU infrastructure
- **Data minimization:** Only process data necessary for the consultation
- **Right to deletion:** Users can delete all data at any time
- **DPIA:** Data Protection Impact Assessment required before launch

## Primary Disclaimer

Every page, every output, every consultation:

> **MedPanel is an exploration and education tool. It does not provide medical advice, diagnosis, or treatment recommendations. Information and perspectives presented are for educational purposes to support informed conversations with your healthcare provider. Always consult a qualified healthcare professional before making health decisions. MedPanel does not establish a doctor-patient relationship.**

## Consent Flow

### Onboarding (one-time)
1. Present purpose statement: "MedPanel helps you explore health questions by presenting multiple medical perspectives and evidence landscapes"
2. Present disclaimer (full text above)
3. Present data handling summary: what's stored, where, how deleted
4. Checkbox: "I understand MedPanel is educational, not medical advice"
5. Checkbox: "I consent to my health data being processed as described"
6. Both must be checked to proceed

### Per-Consultation
Brief reminder at start of each consultation:
> "This exploration is for educational purposes. Discuss any insights with your healthcare provider before making changes."

### Periodic (every 30 days)
Re-present disclaimer with acknowledgment checkbox. Prevents "consent fatigue" from becoming a liability issue.

## Language Rules

### NEVER use:
- "We recommend..."
- "You should..."
- "The best treatment is..."
- "Based on your results, you have..."
- "Take X for your condition"
- "Your diagnosis is..."

### ALWAYS use:
- "Perspectives on this include..."
- "Research has explored several approaches..."
- "Some clinicians might consider..."
- "Questions worth exploring with your provider..."
- "The evidence landscape shows..."
- "A [specialist] approaching this might consider..."

## Output Framing

### Primary output: Questions to Ask Your Doctor
Based on Shepherd et al. (2011) "Ask 3 Questions" framework and Kinnersley et al. (2007) Cochrane Review on question prompt lists — proven to improve consultation quality, patient satisfaction, and health outcomes.

### Evidence Landscape format:
```
WHAT STRONG EVIDENCE SHOWS:
[Systematic reviews, meta-analyses, guideline-endorsed]

WHAT CLINICAL TRIALS SUGGEST:
[RCTs, noting sample sizes and consistency]

WHAT PRELIMINARY RESEARCH INDICATES:
[Clearly labeled as early-stage]

WHAT REMAINS UNKNOWN:
[Explicitly stated gaps]

WHAT'S CURRENTLY BEING RESEARCHED:
[Active clinical trials, emerging areas]
```

### Multi-Perspective format:
```
EXPLORING: [Health Topic]

Perspective A ([Specialty]):
"A [specialist] reviewing this profile might consider..."

Perspective B ([Specialty]):
"From a [specialty] standpoint, the key considerations would be..."

WHERE PERSPECTIVES ALIGN:
[Common ground]

WHERE PERSPECTIVES DIFFER:
[Disagreements with reasoning from each side]
```

## Dual-Mode Output

### Patient Mode
- Plain language (5th-6th grade reading level, Flesch-Kincaid 60-70)
- Evidence tiers (strong/moderate/early/traditional)
- "Questions to ask your doctor" as primary actionable output
- Values clarification ("some people prioritize X, others Y")
- Harding Center fact boxes for risk communication

### Physician Mode
- Clinical terminology
- GRADE ratings on evidence
- Named guidelines with society + year
- Key studies with citations (PMID where available)
- NNT/NNH where applicable
- Cross-specialty reasoning frameworks
- Competing guideline comparison

## Quality Standards
- **IPDAS** (International Patient Decision Aids Standards) — output aligned with IPDAS criteria as quality benchmark
- **Ottawa Decision Support Framework** — consultation structure follows ODSF phases
- **GRADE methodology** — evidence quality communicated using GRADE-aligned tiers
- **AskShareKnow framework** — questions-to-ask output follows validated question prompt list methodology

## What This Product Is NOT
1. Not a symptom checker (not competing with Ada, K Health)
2. Not a medical reference tool (not competing with UpToDate)
3. Not a medical scribe (not competing with Abridge)
4. Not a chatbot that gives health advice (not competing with ChatGPT)
5. Not a telemedicine platform (no human doctors)
6. Not a diagnostic tool
7. Not a treatment recommendation engine

## What This Product IS
An exploration platform that simulates how a team of medical specialists would discuss a complex health question — surfacing multiple perspectives, grounding them in evidence, identifying agreements and disagreements, and generating informed questions for the user to bring to their real healthcare provider.

The closest analogy: **a really well-researched medical documentary about YOUR specific question, produced by a panel of specialists who reviewed YOUR profile.**
