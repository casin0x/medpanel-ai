# MedPanel AI — Services Manifest

## LLM Providers

| Provider | Models | Role in Architecture | Sign Up | Priority |
|---|---|---|---|---|
| **Anthropic** | Opus 4.6, Sonnet 4.6, Haiku 4.5 | Specialist agents (Opus), synthesis (Sonnet), routing (Haiku) | console.anthropic.com | Must have |
| **Perplexity** | Sonar Pro, Sonar, Deep Research | Evidence retrieval + citation grounding — replaces custom RAG | docs.perplexity.ai | Must have |
| **OpenAI** | GPT-4.1, GPT-4o, GPT-4o-mini | Fallback, cross-model verification, best JSON output | platform.openai.com | High |
| **Google** | Gemini 2.5 Pro, Flash | Alternative for long-context, cost optimization | aistudio.google.com | Medium |
| **RunPod** (already have) | Self-host Llama 3.3 70B | GDPR-safe patient data extraction from PDFs | Already have | High |

## Evidence & Medical Data APIs

| Service | Purpose | Cost | Sign Up | Priority |
|---|---|---|---|---|
| **PubMed API (NCBI)** | Citation verification (PMID check), backup evidence search | Free | ncbi.nlm.nih.gov/account | Must have |
| **DrugBank API** | Drug/supplement interaction safety layer (15K+ entries) | Free academic / ~$2K commercial | go.drugbank.com | High |
| **OpenFDA API** | Drug interactions, adverse events, labeling | Free | open.fda.gov/apis | Must have |
| **Natural Medicines DB** | Supplement-drug + supplement-supplement interactions | ~$300-500/yr | naturalmedicines.therapeuticresearch.com | High |
| **Semantic Scholar API** | AI-powered academic search, citation graphs, influence scores | Free | api.semanticscholar.org | High |
| **ClinicalTrials.gov API** | Active/completed trials registry | Free | clinicaltrials.gov/data-api | Medium |

## Medical Terminology & Standards

| Service | Purpose | Cost | Sign Up | Priority |
|---|---|---|---|---|
| **UMLS License** | Maps between SNOMED-CT, ICD-10, LOINC, RxNorm | Free (research) | uts.nlm.nih.gov | Must have |
| **RxNorm API** | Standardized drug names, ingredient lookup | Free | lhncbc.nlm.nih.gov/RxNav | Must have |
| **LOINC Database** | Standardized lab test codes | Free | loinc.org | Must have |
| **SNOMED CT License** | 350K clinical concepts (Sweden is member = free) | Free | snomed.org | High |

## Infrastructure

| Service | Purpose | Cost | Priority |
|---|---|---|---|
| **Supabase** (EU region) | Patient data storage, FHIR-structured, RLS for GDPR | Free tier to start | Must have |
| **Pinecone or Weaviate** | Vector DB for medical knowledge embeddings (if needed beyond Perplexity) | Free tier | Medium |
| **Azure Health Text Analytics** | OCR + NLP for unstructured medical documents | ~$0.01-0.05/doc | Medium |
| **Vercel** (already using) | Frontend hosting | Already have | Must have |

## Total Cost to Start

| Category | Monthly Cost |
|---|---|
| LLM APIs (Claude + Perplexity + OpenAI) | ~$50-200 (development/testing) |
| DrugBank (if commercial) | ~$170/mo ($2K/yr) |
| Natural Medicines DB | ~$30-40/mo ($400/yr) |
| Everything else | Free |
| **Total** | **~$100-400/mo to start** |

All critical evidence APIs (PubMed, OpenFDA, RxNorm, UMLS, LOINC, SNOMED, Semantic Scholar, ClinicalTrials.gov) are FREE.

## Architecture Flow

```
User Question
    │
    ▼
[HAIKU] → Classification (intent, urgency, organ systems, complexity score)
    │
    ├──► [PERPLEXITY SONAR PRO] → Evidence Package
    │     Finds: guidelines, RCTs, meta-analyses for the specific question
    │     Returns: real citations with PMIDs, synthesized findings
    │
    ├──► [DRUGBANK API] → Interaction Check
    │     Drug-drug + drug-supplement interactions for patient's medication list
    │
    ├──► [PUBMED API] → PMID Verification
    │     Verify every citation Perplexity returns is real
    │
    ▼
[OPUS x 3-5] → Specialist Agents (parallel)
    │   Each receives: de-identified patient profile + evidence package + specialist persona
    │   Each outputs: structured JSON recommendation with confidence levels
    │
    ▼
[OPUS x 3-5] → Discussion Rounds (2-3 rounds)
    │   Agents respond to each other's specific claims
    │   Must cite evidence when disagreeing
    │
    ▼
[SONNET] → Moderator / Synthesis
    │   Detects consensus vs disagreement
    │   Compiles structured output
    │
    ▼
[HAIKU] → Safety Check
    │   Red-flag detection, dosing sanity, emergency escalation
    │   Cross-check critical claims against DrugBank
    │
    ▼
User Output (structured, confidence levels, evidence-grounded)
```

## GDPR Privacy Layer

```
SELF-HOSTED (EU, never leaves infrastructure):
├── Patient data storage (Supabase EU)
├── PDF extraction (Llama 3.3 on RunPod EU)
├── De-identification pipeline (strip PII)
└── Re-identification on return

API CALLS (de-identified data only):
├── Specialist reasoning (Claude/GPT)
├── Evidence retrieval (Perplexity — no patient data)
├── Drug interactions (DrugBank — medication names only)
└── Classification (Haiku — de-identified)
```

## Cross-Model Verification (Safety-Critical)

For highest-risk outputs (drug interactions, dosing, emergency triage):
```
Run through Claude Opus → Result A
Run through GPT-4.1 → Result B
If A ≠ B → flag as uncertain, require review
If A = B → higher confidence
```

## Cost Per Consultation Estimate

| Type | Models | Tokens | Cost |
|---|---|---|---|
| Simple (1 specialist) | Haiku + Perplexity + Opus x1 | ~30K | ~$1-2 |
| Moderate (3 specialists) | Haiku + Perplexity + Opus x3 x2 rounds | ~150K | ~$5-8 |
| Complex (5 specialists, 3 rounds) | Haiku + Perplexity + Opus x5 x3 rounds | ~400K | ~$15-25 |

Compare to real second opinion: $200-500+. 50-100x cheaper.
