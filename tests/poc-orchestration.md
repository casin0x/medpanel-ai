# MedPanel POC — Agent Orchestration Plan

Generated: 2026-03-25T23:10:17.738Z
Question: Should I take CoQ10 at 200mg daily for my mitochondrial issues? My OAT shows cis-aconitic acid at 65 (range 10-36). I'm on TRT and have kidney concerns.
Specialists: cardiologist, nephrologist, functional-medicine

## Instructions

Run these agents in Claude Code. Each specialist runs in parallel (Round 1), then the moderator synthesizes.

### Step 1: Run PubMed Evidence (DONE)
24 lines of evidence retrieved.

### Step 2: Spawn Specialist Agents (Round 1 — Parallel)

Spawn these 3 agents simultaneously using the Agent tool:

#### Agent 1: cardiologist
```
# Cardiologist Agent -- Production System Prompt

```
You are a Cardiology Exploration Agent operating within a medical AI health exploration platform.

=== ROLE DEFINITION ===
You are a virtual cardi...
[Full prompt: 24401 characters]
```

#### Agent 2: nephrologist
```
# Nephrologist Agent -- Production System Prompt

```
You are a Nephrology Exploration Agent operating within a medical AI health exploration platform.

=== ROLE DEFINITION ===
You are a virtual nephr...
[Full prompt: 27958 characters]
```

#### Agent 3: functional-medicine
```
# Functional Medicine Agent -- Production System Prompt

```
You are a Functional Medicine Exploration Agent operating within a medical AI health exploration platform.

=== ROLE DEFINITION ===
You are...
[Full prompt: 32681 characters]
```


### Step 3: Collect Round 1 Outputs

After all 3 agents return, collect their outputs.

### Step 4: Round 2 — Cross-Examination

Spawn the same 3 agents again, this time each one receives ALL Round 1 outputs and must respond with agreements, disagreements, and cross-domain risks.

### Step 5: Synthesize

Spawn the moderator agent with all Round 1 + Round 2 outputs. It produces the final exploration output.

---

## Full Agent Prompts (for reference)

### cardiologist (24401 chars)

Stored in: prompts/cardiologist.md
Patient context: 2688 chars
Evidence: 2411 chars

### nephrologist (27958 chars)

Stored in: prompts/nephrologist.md
Patient context: 2688 chars
Evidence: 2411 chars

### functional-medicine (32681 chars)

Stored in: prompts/functional-medicine.md
Patient context: 2688 chars
Evidence: 2411 chars

---

## Quick Run Command

To run this POC right now in Claude Code, paste this:

```
I want to run a MedPanel consultation. Read the file at ~/Documents/DiscussionAgents/tests/cases/founder-case.json for the patient profile. The question is: "Should I take CoQ10 at 200mg daily for my mitochondrial issues? My OAT shows cis-aconitic acid at 65 (range 10-36). I'm on TRT and have kidney concerns."

Spawn 3 specialist agents in parallel (cardiologist, nephrologist, functional-medicine). Each agent should:
1. Read their prompt from ~/Documents/DiscussionAgents/prompts/[specialist].md
2. Analyze the patient profile
3. Return their independent analysis

Use the evidence package below for grounding:

## Evidence Package (PubMed)

### Query: "Hypogonadism treatment evidence"

**[C-001]** European Academy of Andrology (EAA) guidelines on investigation, treatment and monitoring of functional hypogonadism in males: Endorsing organization: European Society of Endocrinology. (2021) — PMID: 32026626
> Evidence regarding functional hypogonadism, previously referred to as 'late-onset' hypogonadism, has increased substantially during the last 10&#xa0;year....

**[C-002]** Approach to the Patient With Prolactinoma. (2023) — PMID: 36974474
> Prolactinomas are the most common pituitary tumor histotype, with microprolactinomas being prevalent in women and macroprolactinomas in men. Hyperprolactinemia is among the most common causes of hypogonadotropic hypogonadism in both sexes, prompting medical advice for hypogonadism (infertility, olig...

**[C-003]** Testosterone Therapy in Men With Hypogonadism: An Endocrine Society Clinical Practice Guideline. (2018) — PMID: 29562364
> To update the "Testosterone Therapy in Men With Androgen Deficiency Syndromes" guideline published in 2010....

### Query: "Autonomic dysregulation treatment evidence"

**[C-004]** Orthostatic hypotension in older people: considerations, diagnosis and management. (2021) — PMID: 34001585
> Orthostatic hypotension (OH) is very common in older people and is encountered daily in emergency departments and medical admissions units. It is associated with a higher risk of falls, fractures, dementia and death, so prompt recognition and treatment are essential. In this review article, we descr...

**[C-005]** Orthostatic Hypotension, Hypertension Treatment, and Cardiovascular Disease: An Individual Participant Meta-Analysis. (2023) — PMID: 37847274
> There are ongoing concerns about the benefits of intensive vs standard blood pressure (BP) treatment among adults with orthostatic hypotension or standing hypotension....

**[C-006]** Postural orthostatic tachycardia syndrome (POTS): State of the science and clinical care from a 2019 National Institutes of Health Expert Consensus Meeting - Part 1. (2021) — PMID: 34144933
> Postural orthostatic tachycardia syndrome (POTS) is a chronic and often disabling disorder characterized by orthostatic intolerance with excessive heart rate increase without hypotension during upright posture. Patients often experience a constellation of other typical symptoms including fatigue, ex...


After all 3 return, synthesize their outputs using the moderator prompt at ~/Documents/DiscussionAgents/prompts/moderator.md
```
