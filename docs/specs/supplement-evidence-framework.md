# Supplement Evidence Framework -- Production System

## The Core Problem

Most supplement evidence sits at Level 4-5 on the traditional evidence hierarchy. RCTs are rare, often underpowered, frequently industry-funded, and almost never replicated at scale. Yet millions of people take supplements, and dismissing the entire category leaves users without any framework for thinking about what they're putting in their bodies.

The goal: Be honest about evidence quality while still being useful. Never overstate. Never dismiss without reason. Always contextualize.

---

## Evidence Tier System

### Tier S -- Strong Clinical Evidence
**Criteria:** Multiple RCTs (n > 200 per trial), at least one systematic review/meta-analysis, consistent direction of effect, relevant clinical endpoints (not just biomarkers), published in peer-reviewed journals.

**Examples:**
- Omega-3 fatty acids (EPA/DHA) for triglyceride reduction (4g/day prescription-grade)
- Creatine monohydrate for muscular strength and lean mass
- Psyllium fiber for LDL cholesterol reduction
- Folic acid for neural tube defect prevention (preconception)
- Vitamin D for fall prevention in deficient elderly populations
- Probiotics (specific strains) for antibiotic-associated diarrhea

**Language Pattern:**
```
"[Supplement] has been studied extensively for [outcome]. Multiple randomized
controlled trials, summarized in systematic reviews, have found [effect direction
and magnitude in qualitative terms]. Major medical organizations [do/do not]
include this in their guidelines. The evidence is among the strongest available
for any supplement."
```

**Presentation Rules:**
- Can state the effect with confidence
- Still cannot recommend -- frame as "the evidence landscape shows..."
- Note the specific context (dose, form, population) where evidence applies
- Flag where consumer-grade products may differ from study formulations
- Always note: strong evidence for one outcome does not mean strong evidence for all claimed benefits

---

### Tier A -- Moderate Clinical Evidence
**Criteria:** At least one well-designed RCT (n > 100) OR multiple smaller RCTs with consistent results OR strong observational data from large cohort studies with plausible mechanism.

**Examples:**
- Magnesium for blood pressure in hypertensive individuals
- Berberine for fasting glucose and lipids
- Ashwagandha (KSM-66) for cortisol and anxiety measures
- Melatonin for sleep onset latency
- SAMe for osteoarthritis pain
- Curcumin (bioavailable forms) for inflammatory markers

**Language Pattern:**
```
"There is meaningful clinical evidence for [supplement] in [context]. [Number
descriptor: 'Several' / 'A handful of'] controlled trials have found [effect].
However, the studies are [limitation: smaller than ideal / short-duration /
conducted in specific populations]. This is promising but not yet at the level
where medical guidelines include it. It's a reasonable topic to explore with
your doctor."
```

**Presentation Rules:**
- State what the studies found, but always qualify with study limitations
- Note the specific formulations/doses studied (they matter enormously)
- Flag the gap between "statistically significant biomarker change" and "clinically meaningful health outcome"
- Mention if the evidence is improving (ongoing larger trials) or stagnant

---

### Tier B -- Preliminary Clinical Evidence
**Criteria:** Small human trials (n < 100) with positive signals AND strong mechanistic rationale OR pilot/open-label human studies with biomarker improvements.

**Examples:**
- NMN/NR for NAD+ levels (human pharmacokinetic data, limited clinical outcome data)
- Tongkat ali for testosterone in specific populations
- Lion's mane for cognitive measures
- PQQ for mitochondrial biogenesis markers
- Sulforaphane (from broccoli sprout extract) for various biomarkers
- Apigenin for sleep quality

**Language Pattern:**
```
"Early human research on [supplement] has shown [specific finding], but these
studies are preliminary -- typically small, short-term, and not yet replicated
by independent groups. The biological mechanism is [plausible/well-understood/
speculative]: [brief mechanism]. Larger, longer trials are needed before we can
say confidently whether this translates to meaningful health benefits. This is
in the 'interesting but unproven' category."
```

**Presentation Rules:**
- Lead with what IS known, then contextualize the limitations
- Clearly distinguish biomarker changes from health outcomes ("raising NAD+ levels" vs. "extending healthy lifespan")
- Name the specific uncertainty: Is it dose? Duration? Population? Outcome measure?
- Never say "promising" without also saying what's missing
- If industry-funded, note that explicitly

---

### Tier C -- Mechanistic Evidence Only
**Criteria:** In-vitro studies, animal models, or theoretical basis from known biochemistry. No meaningful human clinical data.

**Examples:**
- Fisetin for senolytic effects (animal data, one tiny human pilot)
- Spermidine for autophagy (epidemiological associations, animal data)
- Urolithin A for mitophagy (cell and animal data, very early human data)
- Most nootropic "stacks" and novel peptides
- Pterostilbene for most claimed benefits beyond basic antioxidant

**Language Pattern:**
```
"The interest in [supplement] is based on [mechanism] observed in laboratory
and/or animal studies. [Brief mechanism explanation]. However, there is very
limited human data. What happens in a petri dish or a mouse does not reliably
predict what happens in humans -- many compounds that look excellent in
preclinical research fail to show benefits (or show harms) in human trials.
This is genuinely speculative territory."
```

**Presentation Rules:**
- Be explicit that this is preclinical
- Explain the mechanism simply (users deserve to understand WHY people are interested)
- State the specific gap: "No human trials," "One tiny human study," etc.
- Never frame animal results as applicable to humans
- Acknowledge that the supplement community's enthusiasm may outpace the science
- If the compound is being studied in registered clinical trials, mention that as a positive signal

---

### Tier D -- Traditional Use / Expert Opinion
**Criteria:** Long history of traditional use (Ayurvedic, TCM, folk medicine) without modern clinical validation, OR based primarily on expert opinion / theoretical reasoning.

**Examples:**
- Shilajit for most claimed benefits
- Many adaptogenic herbs at traditional doses
- Most TCM herb combinations
- Colloidal minerals
- Many "superfood" extracts at supplemental doses

**Language Pattern:**
```
"[Supplement] has a history of use in [tradition/context], where it has been
used for [traditional purpose]. Modern clinical research has not yet validated
these traditional uses with controlled studies. This doesn't necessarily mean
it's ineffective -- it means we don't have the scientific tools to confirm or
deny the traditional claims. Some traditional medicines have ultimately been
validated by modern research; many have not. There is not enough evidence to
form a scientific opinion on efficacy."
```

**Presentation Rules:**
- Respect the tradition without endorsing the claims
- Be honest that absence of evidence is not evidence of absence (but also not evidence of efficacy)
- If there are safety concerns, prioritize those (some traditional remedies have known toxicity)
- Note if modern research has actively contradicted the traditional claims
- Never dismiss traditional use contemptuously, but never equate it with clinical evidence

---

## Handling Contradictory Evidence

This is the most common scenario. Most supplements have a mix of positive, null, and occasionally negative studies. The system must handle this honestly.

### The Contradictory Evidence Template

```json
{
  "supplement": "<name>",
  "evidence_tier": "<tier>",
  "evidence_direction": "contradictory",
  "positive_findings": {
    "summary": "<what positive studies found>",
    "study_characteristics": "<size, population, duration, funding>",
    "strongest_claim": "<the best-supported positive claim>"
  },
  "null_or_negative_findings": {
    "summary": "<what null/negative studies found>",
    "study_characteristics": "<size, population, duration, funding>",
    "strongest_counter": "<the best-supported null/negative finding>"
  },
  "possible_explanations_for_discrepancy": [
    "Dose differences between studies",
    "Population differences (deficient vs. replete)",
    "Formulation/bioavailability differences",
    "Outcome measure differences",
    "Study duration differences",
    "Publication bias",
    "Methodological quality differences"
  ],
  "current_scientific_interpretation": "<where the field currently leans, if anywhere>",
  "what_would_resolve_this": "<what study design would settle the question>"
}
```

### Language Pattern for Contradictory Evidence:

```
"The evidence on [supplement] for [outcome] is genuinely mixed. Some studies --
[characterize: smaller/larger, in which populations] -- have found [positive
result]. Other studies -- [characterize] -- have found no significant effect
[or negative result].

The discrepancy may be due to [most likely explanation: dose, population,
formulation, study design].

What this means practically: the science hasn't converged on a clear answer
yet. If this is something you're considering, it's worth discussing with your
doctor -- they can factor in your specific situation, which may make the
evidence more or less applicable to you."
```

---

## Supplement Interaction Framework

### The Interaction Problem
Supplement-drug and supplement-supplement interaction databases are thin. The major databases (Natural Medicines, Lexicomp) cover common interactions but miss many combinations. The system must be honest about this gap.

### Interaction Classification

```json
{
  "interaction_severity": "major|moderate|minor|theoretical|unknown",
  "evidence_basis": "clinical_report|pharmacokinetic_study|mechanism_based|database_listing|none_found",
  "interaction_description": "<what happens>",
  "clinical_significance": "<why it matters>",
  "confidence_in_assessment": "high|moderate|low|insufficient_data"
}
```

### Known High-Priority Interactions (Hardcoded Flags)

These MUST be flagged regardless of query context if detected in the patient's medication + supplement combination:

| Supplement | Medication | Interaction | Severity |
|-----------|------------|-------------|----------|
| St. John's Wort | SSRIs, MAOIs, many drugs | CYP3A4 induction, serotonin syndrome risk | MAJOR |
| St. John's Wort | Oral contraceptives | Reduced contraceptive efficacy | MAJOR |
| Omega-3 (high dose) | Anticoagulants/antiplatelets | Additive bleeding risk | MODERATE |
| Vitamin K | Warfarin | Antagonizes anticoagulant effect | MAJOR |
| Grapefruit extract | CYP3A4 substrates | Altered drug metabolism | MODERATE-MAJOR |
| Calcium | Levothyroxine | Reduced thyroid hormone absorption | MODERATE |
| Magnesium | Bisphosphonates, antibiotics | Reduced drug absorption | MODERATE |
| CoQ10 | Warfarin | May reduce INR | MODERATE |
| Berberine | CYP substrates, metformin | CYP inhibition, additive glucose lowering | MODERATE |
| Garlic supplements | Anticoagulants | Additive bleeding risk | MODERATE |
| Ginkgo biloba | Anticoagulants, anticonvulsants | Bleeding risk, seizure threshold | MODERATE |
| Red yeast rice | Statins | Additive myopathy risk (contains monacolin K) | MAJOR |
| NAC | Nitroglycerin | Potentiation of hypotensive effect | MODERATE |
| Licorice root | Antihypertensives, diuretics | Mineralocorticoid effect, hypokalemia | MAJOR |

### Language for Interaction Discussions:

**Known interaction:**
```
"There is a recognized interaction between [supplement] and [medication].
[Mechanism]. This is listed in clinical interaction databases and is considered
[severity level]. This is something to discuss with your prescribing physician
before combining these."
```

**Theoretical interaction:**
```
"Based on the known mechanisms of [supplement] and [medication], there is a
theoretical possibility of interaction via [mechanism]. This hasn't been
well-studied clinically, so the actual risk is uncertain. It's worth mentioning
to your doctor or pharmacist."
```

**No data available:**
```
"I don't have reliable information on interactions between [supplement] and
[medication]. This doesn't mean there's no interaction -- it means it hasn't
been studied or reported in the databases I draw from. Your pharmacist may
have additional resources, and it's worth asking."
```

---

## The "What We Know" Template

Every supplement discussion should map to this three-part structure:

```json
{
  "what_we_know": {
    "established_facts": [
      "<fact with evidence tier tag>"
    ],
    "mechanism_of_action": "<how it's believed to work>",
    "known_safety_profile": "<what's known about safety, side effects, contraindications>"
  },
  "what_we_dont_know": {
    "key_unknowns": [
      "<specific open question>"
    ],
    "why_we_dont_know": "<cost of trials, lack of patentability, regulatory landscape>",
    "risks_of_the_unknown": "<what could go wrong that we haven't studied>"
  },
  "what_is_being_studied": {
    "active_research_areas": [
      "<research direction>"
    ],
    "registered_clinical_trials": "<yes/no/description if known>",
    "expected_timeline": "<when we might know more, if estimable>"
  }
}
```

### Example: CoQ10 for Heart Failure

```json
{
  "what_we_know": {
    "established_facts": [
      "[Tier A] The Q-SYMBIO trial (n=420) found CoQ10 supplementation (300mg/day) reduced major adverse cardiac events in heart failure patients over 2 years",
      "[Tier S] Statin medications reduce endogenous CoQ10 production -- this is well-established biochemistry",
      "[Tier A] CoQ10 supplementation generally raises plasma CoQ10 levels, though the clinical significance of this biomarker change is debated",
      "[Tier S] CoQ10 is generally well-tolerated with a favorable safety profile at doses up to 1200mg/day in studies"
    ],
    "mechanism_of_action": "CoQ10 is essential for mitochondrial electron transport chain function and serves as a lipid-soluble antioxidant. In heart failure, myocardial CoQ10 levels are often depleted. Supplementation theoretically restores mitochondrial energy production in cardiac tissue.",
    "known_safety_profile": "Generally well-tolerated. GI discomfort at high doses. May interact with warfarin (reduced INR). Ubiquinol form has better absorption than ubiquinone in some studies."
  },
  "what_we_dont_know": {
    "key_unknowns": [
      "Whether the Q-SYMBIO results replicate in larger, multi-center trials",
      "Optimal dosing for different cardiac conditions",
      "Whether CoQ10 benefits extend to heart failure with preserved ejection fraction (HFpEF)",
      "Whether the benefit is limited to CoQ10-depleted patients or generalizes",
      "Long-term effects beyond 2 years"
    ],
    "why_we_dont_know": "CoQ10 is a natural compound and cannot be patented, reducing pharmaceutical industry incentive to fund large trials. The Q-SYMBIO trial was largely industry-independent, which is both a strength (less bias) and a limitation (limited funding for follow-up).",
    "risks_of_the_unknown": "Relying on CoQ10 as a substitute for guideline-directed heart failure therapy would be dangerous. It should only be considered as a potential adjunct."
  },
  "what_is_being_studied": {
    "active_research_areas": [
      "CoQ10 in statin-associated myopathy (multiple ongoing trials)",
      "CoQ10 combined with selenium in elderly populations (follow-up to KiSel-10)",
      "Ubiquinol vs. ubiquinone bioavailability and clinical equivalence"
    ],
    "registered_clinical_trials": "Several registered on ClinicalTrials.gov for cardiac and mitochondrial endpoints",
    "expected_timeline": "Ongoing; no single definitive large-scale trial is imminent"
  }
}
```

---

## Quality Control Rules for Supplement Content

1. **Never assign Tier S lightly.** If in doubt between S and A, choose A. The bar for "strong" must remain high or the system loses credibility.

2. **Always specify the form and dose studied.** "Curcumin" without specifying bioavailability enhancement (piperine, liposomal, phytosome) is meaningless. "Magnesium" without specifying the salt form is incomplete.

3. **Distinguish between endpoints.** A supplement can be Tier S for one outcome and Tier C for another. CoQ10 is Tier S for "raising plasma CoQ10 levels" but Tier A for "improving heart failure outcomes." Each claim gets its own tier.

4. **Flag the naturalistic fallacy.** "Natural" does not mean safe. Many natural compounds are toxic. Always include safety data.

5. **Flag the dose-response gap.** Study doses often differ wildly from consumer product doses. If a study used 2g/day of EPA and a typical supplement contains 300mg, note this discrepancy.

6. **Acknowledge financial incentives.** If the only positive studies were funded by the supplement manufacturer, say so. If independent replication exists, say that too.

7. **Never compare supplement evidence to pharmaceutical evidence as if they're equivalent.** A Tier A supplement is not equivalent to a Tier A drug -- the regulatory and evidentiary bars are fundamentally different.
