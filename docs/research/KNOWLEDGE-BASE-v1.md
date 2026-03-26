# MedPanel AI — Knowledge Base & Product Framework

## Product Concept
AI-powered multi-specialist medical case conference platform. Takes patient profiles (labs, journals, bloodwork, medical history) → determines which specialist experts are needed → each agent researches evidence-based studies → structured discussion between agents → outputs opinion chart with consensus, disagreements, and confidence levels.

**Validated prototype:** Used on founder (Christian Nordell) as case study — 5 specialist agents (Functional Medicine, Preventive Cardiologist, Endocrinologist, Neuropsychiatrist, Nephrologist) independently reviewed complex health profile, surfaced diagnostic reframes, caught safety issues, and produced actionable consensus recommendations.

---

## Part 1: How Real Medical Case Conferences Work

### MDT (Multi-Disciplinary Team) Protocol

Standard sequence used in hospitals:
1. **Case Presentation** — Presenting clinician summarizes patient history, chief complaint, comorbidities, specific clinical question
2. **Diagnostic Review** — Imaging, pathology, lab results presented
3. **Specialist Input** — Each relevant specialist provides domain-specific assessment
4. **Consensus Discussion** — Group discusses options, weighs evidence and patient factors
5. **Recommendation and Documentation** — Consensus recorded formally, dissenting views documented

### MDT Chair Role
- Senior clinician in primary disease domain
- Ensures all specialists contribute
- Manages time (5-7 min per case in tumor boards)
- Summarizes consensus, identifies disagreements
- Ensures recommendation is documented

### Specialist Selection (Two-Tier)
- **Core Members** — Permanent based on MDT domain
- **Extended/Ad Hoc Members** — Called in based on patient-specific needs
- **Key principle for AI:** Panel composition is dynamically assembled based on the clinical question, not a fixed roster

### Disagreement Resolution (Hierarchy)
1. **Evidence Hierarchy** — Strongest evidence wins
2. **Domain Deference** — Within a specialty's domain, other specialists defer
3. **Chair's Ruling** — When equipoise exists, chair synthesizes
4. **Documented Dissent** — Minority opinions recorded alongside consensus
5. **Escalation** — Unresolved → super-MDT, second opinion, or patient decides
6. **Key principle:** Disagreement is signal, not failure. When specialists disagree = evidence is equivocal → patient values carry more weight

### Documentation Standards
- Standardized proforma: case ID, clinical question, attendees, imaging/path summary, each specialist's input, consensus, dissent, follow-up actions
- SNOMED CT / ICD-10 coding
- UK NHS QS179: MDT decisions recorded in patient record within 24 hours

---

## Part 2: Evidence-Based Medicine Hierarchy

### Evidence Pyramid

| Level | Type | Strength |
|-------|------|----------|
| 1a | Systematic Reviews & Meta-analyses of RCTs | Strongest |
| 1b | Individual RCTs (narrow CI) | Strong |
| 2a | Systematic Reviews of Cohort Studies | Moderate-Strong |
| 2b | Individual Cohort / Low-quality RCTs | Moderate |
| 3a | Systematic Reviews of Case-Control | Moderate-Low |
| 3b | Individual Case-Control Studies | Low-Moderate |
| 4 | Case Series / Case Reports | Low |
| 5 | Expert Opinion / Mechanism-Based | Lowest |

### GRADE System (adopted by WHO, Cochrane, NICE, UpToDate, 100+ organizations)

**Quality of Evidence (4 levels):**
- **High** — Further research very unlikely to change confidence
- **Moderate** — Further research likely to have important impact
- **Low** — Further research very likely to change the estimate
- **Very Low** — Any estimate is very uncertain

**5 Downgrade Factors:** Risk of bias, Inconsistency, Indirectness, Imprecision, Publication bias
**3 Upgrade Factors (observational):** Large effect (RR >2), Dose-response, Confounders reduce effect

**Strength of Recommendation:**
- **Strong** — "We recommend..." (benefits clearly outweigh risks)
- **Conditional/Weak** — "We suggest..." (close balance or uncertain evidence)

### Critical Appraisal Checklists
- CONSORT (RCTs), STROBE (observational), PRISMA (systematic reviews)
- CASP (rapid appraisal), Newcastle-Ottawa Scale, Jadad Scale
- Cochrane Risk of Bias Tool (RoB 2) — gold standard for RCT bias

### Key Databases
| Database | Best For |
|----------|----------|
| PubMed/MEDLINE (35M+ citations) | Broadest search |
| Cochrane Library | Highest quality pre-appraised evidence |
| Embase | Pharmacology questions |
| UpToDate | Point-of-care recommendations |
| ClinicalTrials.gov | Emerging/unpublished evidence |
| Epistemonikos | Reviews of reviews |

### Applicability to Individual Patient (PICOT Framework)
- **P**opulation — Does patient match study population?
- **I**ntervention — Feasible for this patient?
- **C**omparison — Relevant comparator?
- **O**utcome — What matters to THIS patient?
- **T**ime — Relevant timeframe?

### NNT/NNH Personalization
- Take population NNT/NNH from trials
- Adjust based on patient's baseline risk
- Higher baseline risk = more favorable NNT

---

## Part 3: Specialist Domain Map

| Specialist | Primary Domain | Key Biomarkers |
|-----------|---------------|----------------|
| Cardiologist | Heart, vascular | Troponin, BNP, lipids, ECG, echo |
| Endocrinologist | Hormones, metabolism | HbA1c, TSH/T3/T4, cortisol, insulin, testosterone, estradiol |
| Nephrologist | Kidneys, electrolytes | Creatinine, eGFR, cystatin C, UACR, electrolytes |
| Hepatologist/GI | Liver, GI tract | ALT, AST, GGT, bilirubin, endoscopy |
| Hematologist | Blood disorders | CBC, ferritin, iron studies, B12, coagulation |
| Rheumatologist | Autoimmune, joints | ANA, RF, ESR, CRP |
| Pulmonologist | Lungs, respiratory | PFTs, ABG, chest CT |
| Neurologist | Brain, nerves | MRI, EEG, EMG, cognitive testing |
| Psychiatrist | Mental health | Clinical scales (PHQ-9, GAD-7), psychopharm |
| Immunologist/Allergist | Immune, allergies | IgE, lymphocyte subsets |
| Oncologist | Cancer | Tumor markers, genomic profiling |
| Sleep Medicine | Sleep disorders | Polysomnography, STOP-BANG |
| Functional/Integrative | Systems biology, root cause | OAT, micronutrient panels, gut analysis |
| Clinical Pharmacologist | Drug interactions | CYP450 genotyping, drug levels |
| Nutritionist | Medical nutrition | DEXA, indirect calorimetry |
| Clinical Geneticist | Heritable conditions | WES/WGS, pharmacogenomics |

### Specialist Selection Algorithm
1. Identify primary organ system(s) from question
2. Identify comorbidities creating cross-domain dependencies
3. Identify medication interactions needing pharmacological oversight
4. Always include generalist/internist as integrator
5. Minimum 2 specialists, maximum 5-6

---

## Part 4: Clinical Decision-Making Frameworks

### Shared Decision-Making Models
- **Ottawa Decision Support Framework (ODSF)** — Decisional needs → Decision support → Evaluation
- **Three-Talk Model (Elwyn 2017)** — Team Talk → Option Talk → Decision Talk
- **SHARE Approach (AHRQ)** — Seek participation, Help explore, Assess values, Reach decision, Evaluate

### Risk-Benefit Analysis
- **Benefit-Risk Balance Framework (FDA/EMA)** — List all benefits/risks with magnitude + probability
- **MCDA (Multi-Criteria Decision Analysis)** — Structured weighing
- **QALY/DALY** — Standardized health outcome measurement

### Competing Priorities Resolution
1. **Primum non nocere with hierarchy** — Most life-threatening system takes priority
2. **Therapeutic Ceiling** — Optimize each system to the point further optimization harms another
3. **Pareto Optimization** — No system improvable without worsening another
4. **Time-horizon weighting** — Short-term risks vs long-term benefits

### Clinical Equipoise
When genuine uncertainty exists → present both sides → patient values decide.
AI must explicitly acknowledge equipoise rather than forcing a recommendation.

---

## Part 5: Patient Data Interpretation

### Commonly Misinterpreted Labs
- **Creatinine/eGFR** — Muscular patients get false low eGFR. Use cystatin C.
- **Testosterone** — Diurnal variation, SHBG context, assay methodology matters
- **HbA1c** — Hemoglobin variants, iron deficiency, red cell turnover all falsify
- **Ferritin** — Acute-phase reactant, misleading during inflammation
- **Vitamin D** — Deficiency cutoffs debated (20 vs 30 ng/mL)
- **TSH** — "Normal" range is too wide. Biotin supplements falsify results.
- **Liver enzymes** — Exercise transiently elevates. True upper limit likely lower than lab range.
- **Lipid panel** — Total cholesterol is useless. ApoB better than LDL-C.

### Reference Ranges vs Optimal Ranges

| Marker | Standard Reference | Proposed Optimal (Longevity) | Evidence |
|--------|-------------------|------------------------------|----------|
| Fasting Glucose | 70-100 mg/dL | 72-85 mg/dL | Moderate |
| HbA1c | <5.7% | <5.4% | Moderate |
| LDL-C | <100 | <70 (high risk) | Strong |
| ApoB | <130 | <80 (some argue <60) | Strong |
| hsCRP | <3.0 mg/L | <1.0 mg/L | Strong |
| Vitamin D | 20-100 ng/mL | 40-60 ng/mL | Moderate |
| Fasting Insulin | 2-20 uIU/mL | <8 uIU/mL | Moderate |
| Homocysteine | <15 umol/L | <10 umol/L | Moderate |

**Critical distinction for AI:** Clearly separate targets supported by interventional evidence vs epidemiological association vs expert opinion.

### Trends vs Single Values
- Direction matters more than absolute value
- Rate of change is diagnostic signal
- Single abnormal values have high regression-to-mean probability
- System should normalize for seasonal/circadian variation
- Always request historical data, display trends with intervention annotations

---

## Part 6: AI System Architecture Principles

1. **Dynamic Panel Assembly** — Specialists selected algorithmically per question
2. **Structured Discussion Protocol** — Presentation → Review → Input → Synthesis
3. **Evidence Tagging** — Every recommendation tagged with GRADE level + source
4. **Disagreement as Signal** — Surfaced explicitly, distinguished (equipoise vs trade-off)
5. **Contextual Interpretation** — Labs interpreted with age, sex, meds, lifestyle, trends
6. **Trend-First Analysis** — Historical data prioritized over single values
7. **Explicit Uncertainty** — Transparent about unknowns
8. **Documentation Output** — Structured MDT proforma format

---

## Part 7: What Would Get This to Research-Grade (gaps to fill)

1. **Regulatory** — MDR/SaMD classification for EU, CE marking, clinical validation
2. **AI Accuracy** — PubMed/Cochrane API integration, study verification layer, hallucination detection
3. **Liability** — Legal framework, clinical governance, insurance
4. **Data Privacy** — GDPR Article 9 compliance, encryption, DPA
5. **Reproducibility** — Temperature controls, deterministic outputs for critical recommendations
6. **Safety Rails** — Emergency detection, escalation to human doctors
7. **Input Validation** — Unit checking, completeness scoring, pre-analytic flagging
8. **Knowledge Currency** — RAG pipeline, human curator review cycle
9. **Multi-Agent Orchestration** — True interactive discussion (not just parallel reviews + manual synthesis)
10. **Validation Methodology** — Comparison with real specialist panels, accuracy metrics

---

*Knowledge base compiled March 24, 2026. Based on multi-specialist case conference prototype + dedicated research.*
