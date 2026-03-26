# Evidence Retrieval Pipeline -- Complete Production Specification

## Overview

The evidence pipeline is the data backbone of every MedPanel consultation. It runs after classification (Haiku) and before specialist agents (Opus). Its job: fetch, verify, and package external evidence so agents reason from real citations -- not parametric hallucinations.

**Pipeline constraint:** Total wall-clock time under 15 seconds. Every step either runs in parallel or has a hard timeout with graceful degradation.

---

## 1. Pipeline Architecture

### Data Flow

```
Classification Output (from Haiku)
    |
    v
[Step 1] Query Generation ──────────────────────── ~200ms
    |   Inputs: classified question, patient profile, specialist roster
    |   Output: 2-5 search queries (one shared, rest specialist-specific)
    |
    ├──────────────────────────────────┐
    v                                  v
[Step 2] Perplexity Sonar Pro     [Step 4] DrugBank API         ── parallel ──
    |   Primary evidence search        |   Drug interaction check     ~3-8s
    |   Returns citations + PMIDs      |
    |                                  ├─► [Step 5] RxNorm API
    v                                  |   Medication normalization
[Step 3] PubMed Verification           |
    |   Verify every PMID is real      v
    |   Batch via E-utilities     Drug Interaction Results
    |
    v
Verified Evidence Results
    |
    └──────────────────────────────────┘
                    |
                    v
            [Step 6] Evidence Package Assembly ──── ~100ms
                    |
                    v
            Evidence Package (JSON)
            → Distributed to specialist agents
```

### Parallelism Strategy

Steps 2+3 and Steps 4+5 run as two parallel tracks. Step 3 depends on Step 2's output (PMIDs to verify). Step 5 runs before Step 4 (normalize names before checking interactions). Step 6 waits for both tracks.

```
Timeline (target):
0ms     ──── Step 1: Query Generation
200ms   ──── Step 2 starts | Step 5 starts (parallel)
1200ms  ──── Step 5 completes → Step 4 starts
3000ms  ──── Step 2 completes → Step 3 starts
5000ms  ──── Step 4 completes
8000ms  ──── Step 3 completes
8100ms  ──── Step 6: Package Assembly
~8.5s   ──── Evidence Package ready
```

Worst-case with retries: ~14 seconds. Hard timeout at 15 seconds -- whatever is available gets packaged, missing pieces flagged as `retrieval_timeout`.

---

## 2. Step 1: Query Generation

The classifier output plus the patient profile are used to generate targeted search queries. This is an LLM call (Haiku, fast and cheap).

### Input

```json
{
  "classification": {
    "intent": "medication_management",
    "organ_systems": ["cardiovascular", "endocrine"],
    "urgency": "routine",
    "complexity_score": 6.5,
    "specialists_selected": ["cardiologist", "endocrinologist", "pharmacologist"]
  },
  "patient_context": {
    "age": 38,
    "sex": "male",
    "conditions": ["hypertension", "hypogonadism"],
    "medications": ["testosterone cypionate 200mg/week", "lisinopril 10mg daily"],
    "supplements": ["fish oil 2g", "vitamin D3 5000IU", "magnesium glycinate 400mg"],
    "question": "Should I switch from lisinopril to telmisartan given my TRT use?"
  }
}
```

### Query Generation Prompt (Haiku)

```
You are a medical evidence search query generator. Given a classified patient question and profile, generate search queries optimized for Perplexity Sonar Pro (which searches the live web, PubMed, and medical databases).

Rules:
1. Generate exactly ONE shared query (the core clinical question, sent to all agents).
2. Generate ONE specialist-specific query per selected specialist (deeper dive into their domain).
3. Each query must be a natural-language clinical question, NOT keyword soup.
4. Include relevant patient specifics (age, sex, conditions) when they affect evidence relevance.
5. Ask for "systematic reviews, meta-analyses, or clinical guidelines" when possible.
6. For drug questions, ask for "head-to-head trials" or "comparative effectiveness."

Output format (JSON):
{
  "shared_query": "string",
  "specialist_queries": {
    "cardiologist": "string",
    "endocrinologist": "string",
    "pharmacologist": "string"
  }
}
```

### Example Output

```json
{
  "shared_query": "Comparative effectiveness of telmisartan vs lisinopril for hypertension in men on testosterone replacement therapy: systematic reviews, clinical guidelines, and head-to-head trials",
  "specialist_queries": {
    "cardiologist": "ARB vs ACE inhibitor cardiovascular outcomes in hypertensive men aged 30-45 on TRT: effect on left ventricular hypertrophy, arterial stiffness, and RAAS modulation",
    "endocrinologist": "Telmisartan PPAR-gamma agonist effects on testosterone metabolism, insulin sensitivity, and body composition in hypogonadal men on TRT",
    "pharmacologist": "Telmisartan vs lisinopril pharmacokinetic interactions with testosterone cypionate: CYP450 metabolism, renal clearance, and ACE inhibitor cough incidence on androgens"
  }
}
```

### Cost: ~$0.001 per query generation (Haiku, ~2K tokens)

---

## 3. Step 2: Perplexity Sonar Pro -- Primary Evidence Retrieval

### API Specification

**Endpoint:** `POST https://api.perplexity.ai/chat/completions`

**Model:** `sonar-pro` (200K context, grounded search, returns inline citations)

**Headers:**
```
Authorization: Bearer {PERPLEXITY_API_KEY}
Content-Type: application/json
```

### Request Format

```json
{
  "model": "sonar-pro",
  "messages": [
    {
      "role": "system",
      "content": "You are a medical evidence retrieval specialist. For every claim, provide specific citations including PubMed IDs (PMIDs) when available. Structure your response as follows:\n\n1. EVIDENCE SUMMARY: A concise synthesis of the evidence landscape.\n2. KEY STUDIES: For each relevant study, provide:\n   - Title\n   - Authors (first author et al.)\n   - Journal, Year\n   - PMID (if available, format as PMID:12345678)\n   - Study type (RCT, meta-analysis, cohort, etc.)\n   - Sample size\n   - Key finding relevant to the query\n   - GRADE-equivalent evidence quality (high/moderate/low/very low)\n3. CLINICAL GUIDELINES: Any relevant society guidelines (AHA, ESC, Endocrine Society, etc.) with year and recommendation grade.\n4. EVIDENCE GAPS: What is NOT well-studied or where evidence is conflicting.\n\nAlways distinguish between evidence from randomized trials vs observational data vs mechanistic studies. When studies conflict, present both sides."
    },
    {
      "role": "user",
      "content": "{generated_query}"
    }
  ],
  "max_tokens": 4096,
  "temperature": 0.1,
  "return_citations": true,
  "search_recency_filter": "month"
}
```

### Query Strategy: One Call Per Query

Each query (shared + specialist-specific) gets its own Perplexity call. These run in parallel.

For a 3-specialist consultation: 4 parallel Perplexity calls (1 shared + 3 specialist).
For a 5-specialist consultation: 6 parallel Perplexity calls (1 shared + 5 specialist).

### Rate Limiting

- Perplexity rate limit: check current tier (typically 50-100 RPM for pro tier)
- Implementation: semaphore-based concurrency limiter, max 6 parallel calls
- Retry: exponential backoff (1s, 2s, 4s), max 3 retries
- Hard timeout per call: 10 seconds

```typescript
const PERPLEXITY_CONFIG = {
  maxConcurrent: 6,
  timeoutMs: 10_000,
  retryAttempts: 3,
  retryBaseDelayMs: 1000,
  retryBackoffMultiplier: 2,
};
```

### Response Parsing

Perplexity returns `choices[0].message.content` (the text) and `citations` (array of URLs). The challenge: extracting structured citation data from the natural-language response.

**Parsing strategy:** Post-process Perplexity's response with a fast LLM call (Haiku) to extract structured citation data.

```json
{
  "model": "claude-haiku-4-5-20250315",
  "max_tokens": 2048,
  "system": "Extract all citations from this medical evidence text into structured JSON. For each citation, extract: title, authors, journal, year, pmid (if mentioned, as a string of digits only), study_type, sample_size, key_finding, evidence_quality. If a field is not present, use null. Output ONLY valid JSON array.",
  "messages": [
    {
      "role": "user",
      "content": "{perplexity_response_text}"
    }
  ]
}
```

**Parsed citation structure:**
```json
{
  "citations": [
    {
      "title": "Telmisartan vs Perindopril in Hypertensive Patients: PRISMA Meta-Analysis",
      "authors": "Zhang L et al.",
      "journal": "Journal of Hypertension",
      "year": 2023,
      "pmid": "37845123",
      "study_type": "meta_analysis",
      "sample_size": 12450,
      "key_finding": "Telmisartan showed comparable BP reduction with lower incidence of cough (RR 0.12, 95% CI 0.08-0.18)",
      "evidence_quality": "high",
      "perplexity_source_url": "https://pubmed.ncbi.nlm.nih.gov/37845123/"
    }
  ],
  "guidelines": [
    {
      "body": "ESC/ESH",
      "title": "2023 ESH Guidelines for the management of arterial hypertension",
      "year": 2023,
      "recommendation": "ARBs and ACE inhibitors are considered equivalent first-line therapy (Class I, Level A)",
      "grade": "I-A"
    }
  ],
  "evidence_gaps": [
    "No RCTs specifically comparing ACE inhibitors vs ARBs in men on TRT",
    "Limited data on telmisartan PPAR-gamma effects at antihypertensive doses"
  ],
  "summary": "string — the evidence synthesis paragraph"
}
```

### Perplexity `search_recency_filter` Strategy

| Query Type | Filter | Rationale |
|---|---|---|
| Drug safety / interactions | `"month"` | Need latest safety signals |
| Clinical guidelines | `"year"` | Guidelines update annually at most |
| Mechanism of action | none | Evergreen knowledge |
| Emerging research | `"week"` | Cutting edge, need freshest data |

Determined by the query generator (Haiku) which tags each query with a `recency` field.

### Cost Per Consultation

| Consultation Type | Perplexity Calls | Est. Input Tokens | Est. Output Tokens | Cost |
|---|---|---|---|---|
| Simple (2 specialists) | 3 | ~3K | ~12K | ~$0.15 |
| Moderate (3 specialists) | 4 | ~4K | ~16K | ~$0.20 |
| Complex (5 specialists) | 6 | ~6K | ~24K | ~$0.30 |

Plus Haiku parsing: ~$0.005 per call. Negligible.

---

## 4. Step 3: PubMed Verification Layer

Every PMID extracted from Perplexity responses gets verified against the NCBI E-utilities API. This catches hallucinated PMIDs (a known LLM failure mode).

### Why This Matters

Perplexity grounds responses in web search, but the PMIDs it extracts or generates can be:
1. **Correct** -- exists and matches the described study
2. **Real but misattributed** -- PMID exists but points to a different study
3. **Fabricated** -- PMID does not exist at all

Our verification catches cases 2 and 3.

### NCBI E-utilities API

**Base URL:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`

**Authentication:** API key recommended for higher rate limits (10 req/s vs 3 req/s without key).
```
Registration: https://www.ncbi.nlm.nih.gov/account/
Key parameter: &api_key={NCBI_API_KEY}
```

### Verification Flow

```
Extract PMIDs from parsed Perplexity response
    |
    v
Batch lookup via efetch (up to 200 PMIDs per call)
    |
    v
For each PMID, compare returned metadata against Perplexity's claimed metadata:
    - Title similarity (fuzzy match, >0.7 threshold)
    - Year match (exact or +/- 1 year)
    - Journal match (fuzzy, accounting for abbreviations)
    |
    v
Tag each citation: verified | misattributed | not_found | verification_failed
```

### API Call: Batch Fetch

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
  ?db=pubmed
  &id=37845123,36792451,35890044
  &rettype=xml
  &retmode=xml
  &api_key={NCBI_API_KEY}
```

**Response:** PubMed XML with full article metadata.

### Parsing the efetch Response

Extract from the XML `<PubmedArticle>` elements:

```typescript
interface PubMedArticle {
  pmid: string;
  title: string;
  journal: string;
  year: number;
  authors: string[];  // First author + "et al." for matching
  doi: string | null;
  abstract: string | null;
  mesh_terms: string[];
  publication_types: string[];  // "Randomized Controlled Trial", "Meta-Analysis", etc.
}
```

### Verification Logic

```typescript
function verifycitation(
  claimed: PerplexityCitation,
  pubmed: PubMedArticle
): VerificationResult {

  // Title similarity using normalized Levenshtein or Jaccard
  const titleSim = jaccardSimilarity(
    normalize(claimed.title),
    normalize(pubmed.title)
  );

  // Year check: exact or +/- 1 (publication vs online-first dates differ)
  const yearMatch = Math.abs((claimed.year ?? 0) - pubmed.year) <= 1;

  // Study type check: compare claimed type against PubMed publication_types
  const typeMatch = pubmed.publication_types.some(pt =>
    mapPubMedTypeToOurs(pt) === claimed.study_type
  );

  if (titleSim > 0.7 && yearMatch) {
    return {
      status: "verified",
      pubmed_title: pubmed.title,
      pubmed_year: pubmed.year,
      pubmed_doi: pubmed.doi,
      pubmed_abstract: pubmed.abstract,
      type_confirmed: typeMatch,
    };
  }

  if (titleSim > 0.3) {
    return {
      status: "misattributed",
      pubmed_title: pubmed.title,
      claimed_title: claimed.title,
      note: "PMID exists but appears to reference a different study",
    };
  }

  return {
    status: "misattributed",
    pubmed_title: pubmed.title,
    claimed_title: claimed.title,
    note: "PMID exists but does not match the described study at all",
  };
}
```

### When Verification Fails

| Scenario | Action | Flag |
|---|---|---|
| PMID verified, metadata matches | Keep citation as-is | `"verified": true` |
| PMID exists, metadata mismatch | Keep citation, add warning, include correct PubMed metadata | `"verified": false, "verification_note": "PMID exists but references different study"` |
| PMID does not exist (404 / not in efetch results) | Keep citation text, remove PMID | `"verified": false, "pmid": null, "verification_note": "PMID not found in PubMed"` |
| E-utilities API timeout | Keep citation, flag as unverified | `"verified": null, "verification_note": "PubMed verification timed out"` |
| E-utilities API down entirely | All citations flagged as unverified | `"verification_status": "service_unavailable"` |

**Critical rule:** Never silently remove a citation. Always keep the claim text and flag the verification status. Agents need to know what they can and cannot trust.

### Batch Efficiency

- efetch accepts up to 200 PMIDs per request
- Typical consultation: 10-30 unique PMIDs across all Perplexity calls
- Usually 1 batch call handles everything
- Timeout: 5 seconds per batch call, 2 retries

### Caching

Verified PMIDs are cached in Supabase:

```sql
CREATE TABLE pubmed_cache (
  pmid TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  journal TEXT,
  year INTEGER,
  authors TEXT[],
  doi TEXT,
  abstract TEXT,
  publication_types TEXT[],
  mesh_terms TEXT[],
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Cache TTL: 90 days (metadata rarely changes, retracted papers handled separately)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX idx_pubmed_cache_expires ON pubmed_cache(expires_at);
```

Before calling E-utilities, check cache first:
```typescript
async function verifyPMIDs(pmids: string[]): Promise<Map<string, PubMedArticle>> {
  // 1. Check cache
  const cached = await supabase
    .from('pubmed_cache')
    .select('*')
    .in('pmid', pmids)
    .gt('expires_at', new Date().toISOString());

  const cachedMap = new Map(cached.data.map(r => [r.pmid, r]));
  const uncached = pmids.filter(id => !cachedMap.has(id));

  // 2. Fetch uncached from E-utilities
  if (uncached.length > 0) {
    const fetched = await fetchFromEutils(uncached);
    // 3. Write to cache
    await supabase.from('pubmed_cache').upsert(fetched);
    fetched.forEach(r => cachedMap.set(r.pmid, r));
  }

  return cachedMap;
}
```

---

## 5. Step 4: DrugBank API -- Interaction Checking

### Purpose

Check every pairwise combination of the patient's medications + supplements for known interactions. This runs in parallel with the Perplexity evidence retrieval track.

### Input: Full Medication + Supplement List

Pulled from the patient profile. Includes everything in `medications[]` where `status === "active"` and `type` is any of `prescription`, `otc`, `supplement`, `prn`.

Example input list:
```json
[
  { "name": "testosterone cypionate", "rxnorm_cui": "1014678", "type": "prescription" },
  { "name": "lisinopril", "rxnorm_cui": "29046", "type": "prescription" },
  { "name": "fish oil", "rxnorm_cui": null, "type": "supplement" },
  { "name": "vitamin D3", "rxnorm_cui": "11253", "type": "supplement" },
  { "name": "magnesium glycinate", "rxnorm_cui": null, "type": "supplement" }
]
```

### Step 5 Runs First: RxNorm Normalization

Before calling DrugBank, normalize all medication names through RxNorm to get canonical identifiers. This handles brand names, misspellings, and variations.

**RxNorm API:**

```
GET https://rxnav.nlm.nih.gov/REST/rxcui.json?name=lisinopril&search=1
```

Response:
```json
{
  "idGroup": {
    "name": "lisinopril",
    "rxnormId": ["29046"]
  }
}
```

For approximate matching (handles misspellings, brand names):
```
GET https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=tylenol&maxEntries=1
```

Response includes the RxCUI mapped to the generic ingredient (acetaminophen).

**Normalization flow:**
```typescript
async function normalizeMedications(
  meds: PatientMedication[]
): Promise<NormalizedMedication[]> {

  return Promise.all(meds.map(async (med) => {
    // Skip if we already have an RxNorm CUI
    if (med.rxnorm_cui) {
      return { ...med, normalized: true };
    }

    // Try exact match first
    const exact = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(med.name)}&search=1`
    );
    const exactData = await exact.json();

    if (exactData.idGroup?.rxnormId?.length > 0) {
      return {
        ...med,
        rxnorm_cui: exactData.idGroup.rxnormId[0],
        normalized: true
      };
    }

    // Fall back to approximate matching
    const approx = await fetch(
      `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(med.name)}&maxEntries=3`
    );
    const approxData = await approx.json();

    const candidates = approxData.approximateGroup?.candidate;
    if (candidates?.length > 0) {
      return {
        ...med,
        rxnorm_cui: candidates[0].rxcui,
        rxnorm_name: candidates[0].name,
        normalized: true,
        normalized_via: "approximate_match",
      };
    }

    // Not found in RxNorm (common for supplements)
    return {
      ...med,
      normalized: false,
      normalized_via: "not_found_in_rxnorm"
    };
  }));
}
```

**RxNorm rate limit:** 20 requests/second (no key required). Plenty for our use case.

### DrugBank API Calls

**Base URL:** `https://api.drugbank.com/v1/`

**Authentication:**
```
Authorization: Bearer {DRUGBANK_API_KEY}
```

**Interaction lookup by DrugBank ID:**
```
GET https://api.drugbank.com/v1/ddi?drugbank_id=DB00722&drugbank_id=DB01197
```

Or by name:
```
GET https://api.drugbank.com/v1/ddi?name=lisinopril&name=testosterone
```

**Response:**
```json
{
  "interactions": [
    {
      "drug_1": {
        "drugbank_id": "DB00722",
        "name": "Lisinopril"
      },
      "drug_2": {
        "drugbank_id": "DB00624",
        "name": "Testosterone"
      },
      "description": "Testosterone may increase the hypotensive activities of Lisinopril.",
      "severity": "moderate",
      "extended_description": "...",
      "references": ["PMID:12345678"]
    }
  ]
}
```

### Pairwise Interaction Check Strategy

For N medications/supplements, there are N*(N-1)/2 pairs. For a typical patient with 8 items, that is 28 pairs. DrugBank can handle batch queries, but we also need to be efficient.

```typescript
async function checkAllInteractions(
  meds: NormalizedMedication[]
): Promise<DrugInteraction[]> {

  const interactions: DrugInteraction[] = [];
  const pairs: [NormalizedMedication, NormalizedMedication][] = [];

  // Generate all unique pairs
  for (let i = 0; i < meds.length; i++) {
    for (let j = i + 1; j < meds.length; j++) {
      pairs.push([meds[i], meds[j]]);
    }
  }

  // DrugBank batch: check up to 10 pairs per request
  const batchSize = 10;
  const batches = chunk(pairs, batchSize);

  const results = await Promise.all(
    batches.map(batch => queryDrugBankBatch(batch))
  );

  return results.flat();
}
```

### Severity Classification Mapping

DrugBank severity maps to MedPanel's scale:

| DrugBank Severity | MedPanel Severity | Agent Instruction |
|---|---|---|
| `major` | `contraindicated` | Agent MUST flag, safety system alerted |
| `moderate` | `major` | Agent MUST discuss, include in all specialist outputs |
| `minor` | `moderate` | Agent SHOULD mention if relevant to their domain |
| `food interaction` | `minor` | Agent MAY mention, include in pharmacologist output |

### Supplement Gap: What DrugBank Doesn't Cover

DrugBank has good coverage for prescription drugs but patchy coverage for supplements (fish oil, ashwagandha, NAC, etc.). For supplements specifically:

**Fallback 1: Natural Medicines Database API**

If a subscription is active (see SERVICES-MANIFEST.md):
```
GET https://api.naturalmedicines.therapeuticresearch.com/v1/interactions
  ?product1=fish+oil
  &product2=lisinopril
```

Natural Medicines has the best supplement interaction data available. Covers herb-drug, supplement-drug, and supplement-supplement interactions.

**Fallback 2: OpenFDA Adverse Event Reports**

```
GET https://api.fda.gov/drug/event.json
  ?search=patient.drug.openfda.generic_name:"lisinopril"+AND+patient.drug.openfda.generic_name:"fish+oil"
  &limit=5
```

This searches FDA adverse event reports for co-reported substances. Not a direct interaction database, but signal detection for combinations without formal interaction studies.

**Fallback 3: Perplexity query**

If a supplement pair has no data in DrugBank or Natural Medicines, a targeted Perplexity query runs:
```
"Known interactions between [supplement A] and [drug/supplement B]: clinical evidence, case reports, and pharmacological mechanisms"
```

This result gets tagged with `"source": "perplexity_supplement_search", "evidence_quality": "variable"`.

### Supplement Interaction Decision Tree

```
Supplement pair needs interaction check
    |
    v
[DrugBank] → found? ──yes──► Use DrugBank result (high confidence)
    |
    no
    v
[Natural Medicines DB] → found? ──yes──► Use NM result (high confidence)
    |
    no
    v
[OpenFDA adverse events] → signals? ──yes──► Flag as "signal detected" (low confidence)
    |
    no
    v
[Perplexity targeted query] → evidence found? ──yes──► Use with "unverified" flag
    |
    no
    v
Mark as "no known interaction data available" — agents may use parametric knowledge but must flag uncertainty
```

---

## 6. Evidence Package Schema

This is the exact JSON structure passed to specialist agents. It is referenced as `evidence-package.json` in the project schemas.

### Complete Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MedPanel Evidence Package",
  "description": "Complete evidence bundle assembled by the retrieval pipeline, distributed to specialist agents.",
  "type": "object",
  "required": ["package_id", "consultation_id", "generated_at", "retrieval_status", "shared_evidence", "drug_interactions"],
  "properties": {

    "package_id": {
      "type": "string",
      "format": "uuid"
    },

    "consultation_id": {
      "type": "string",
      "format": "uuid"
    },

    "generated_at": {
      "type": "string",
      "format": "date-time"
    },

    "retrieval_status": {
      "type": "object",
      "description": "Health status of each pipeline step",
      "required": ["overall"],
      "properties": {
        "overall": {
          "type": "string",
          "enum": ["complete", "partial", "degraded", "unavailable"]
        },
        "perplexity": {
          "type": "string",
          "enum": ["success", "partial", "timeout", "error", "skipped"]
        },
        "pubmed_verification": {
          "type": "string",
          "enum": ["success", "partial", "timeout", "error", "skipped"]
        },
        "drugbank": {
          "type": "string",
          "enum": ["success", "partial", "timeout", "error", "skipped"]
        },
        "rxnorm": {
          "type": "string",
          "enum": ["success", "partial", "timeout", "error", "skipped"]
        },
        "natural_medicines": {
          "type": "string",
          "enum": ["success", "partial", "timeout", "error", "skipped", "not_subscribed"]
        },
        "errors": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "step": { "type": "string" },
              "error": { "type": "string" },
              "fallback_used": { "type": "string" }
            }
          }
        },
        "wall_clock_ms": {
          "type": "integer",
          "description": "Total pipeline execution time in milliseconds"
        }
      }
    },

    "shared_evidence": {
      "type": "object",
      "description": "Evidence from the shared query — sent to ALL specialist agents",
      "properties": {
        "query_used": { "type": "string" },
        "summary": {
          "type": "string",
          "description": "Perplexity's synthesized evidence summary"
        },
        "citations": {
          "type": "array",
          "items": { "$ref": "#/$defs/citation" }
        },
        "guidelines": {
          "type": "array",
          "items": { "$ref": "#/$defs/guideline" }
        },
        "evidence_gaps": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },

    "specialist_evidence": {
      "type": "object",
      "description": "Evidence from specialist-specific queries — only sent to the relevant agent",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "query_used": { "type": "string" },
          "summary": { "type": "string" },
          "citations": {
            "type": "array",
            "items": { "$ref": "#/$defs/citation" }
          },
          "guidelines": {
            "type": "array",
            "items": { "$ref": "#/$defs/guideline" }
          },
          "evidence_gaps": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },

    "drug_interactions": {
      "type": "object",
      "description": "Complete interaction check results — sent to ALL agents, emphasized to pharmacologist",
      "properties": {
        "medications_checked": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "rxnorm_cui": { "type": "string" },
              "rxnorm_name": { "type": "string", "description": "Canonical name from RxNorm" },
              "normalized": { "type": "boolean" },
              "type": { "type": "string", "enum": ["prescription", "otc", "supplement", "prn"] }
            }
          }
        },
        "interactions_found": {
          "type": "array",
          "items": { "$ref": "#/$defs/interaction" }
        },
        "pairs_with_no_data": {
          "type": "array",
          "description": "Medication pairs where no interaction data was found in any source",
          "items": {
            "type": "object",
            "properties": {
              "drug_a": { "type": "string" },
              "drug_b": { "type": "string" },
              "sources_checked": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        },
        "critical_interactions_count": { "type": "integer" },
        "total_interactions_count": { "type": "integer" }
      }
    },

    "token_budget": {
      "type": "object",
      "description": "Token usage tracking to ensure agents receive the package within context limits",
      "properties": {
        "total_tokens_estimated": {
          "type": "integer",
          "description": "Estimated token count of the full evidence package"
        },
        "shared_evidence_tokens": { "type": "integer" },
        "specialist_evidence_tokens": {
          "type": "object",
          "additionalProperties": { "type": "integer" }
        },
        "drug_interactions_tokens": { "type": "integer" },
        "truncated": {
          "type": "boolean",
          "description": "Whether evidence was truncated to fit context window"
        },
        "truncation_strategy": {
          "type": "string",
          "description": "If truncated, what was removed (lowest-quality citations first)"
        }
      }
    }
  },

  "$defs": {
    "citation": {
      "type": "object",
      "required": ["title", "claim", "verification_status"],
      "properties": {
        "title": { "type": "string" },
        "authors": { "type": "string" },
        "journal": { "type": "string" },
        "year": { "type": "integer" },
        "pmid": { "type": "string", "description": "Null if not available or verification found it fabricated" },
        "doi": { "type": "string" },
        "url": { "type": "string", "format": "uri" },
        "study_type": {
          "type": "string",
          "enum": [
            "systematic_review", "meta_analysis", "rct",
            "cohort", "case_control", "cross_sectional",
            "case_report", "guideline", "mechanistic",
            "expert_opinion", "narrative_review", "unknown"
          ]
        },
        "sample_size": { "type": "integer" },
        "claim": {
          "type": "string",
          "description": "The specific claim this citation supports"
        },
        "key_finding": { "type": "string" },
        "evidence_quality": {
          "type": "string",
          "enum": ["high", "moderate", "low", "very_low"],
          "description": "GRADE-equivalent quality rating"
        },
        "verification_status": {
          "type": "string",
          "enum": ["verified", "misattributed", "not_found", "verification_failed", "no_pmid"],
          "description": "Result of PubMed PMID verification"
        },
        "verification_note": {
          "type": "string",
          "description": "Explanation when verification_status is not 'verified'"
        },
        "pubmed_metadata": {
          "type": "object",
          "description": "Actual metadata from PubMed (if verified). Agents should prefer this over Perplexity's claimed metadata.",
          "properties": {
            "title": { "type": "string" },
            "journal": { "type": "string" },
            "year": { "type": "integer" },
            "doi": { "type": "string" },
            "abstract_excerpt": {
              "type": "string",
              "description": "First 500 chars of abstract, for agents to verify claim matches"
            }
          }
        }
      }
    },

    "guideline": {
      "type": "object",
      "properties": {
        "body": { "type": "string", "description": "e.g. 'AHA/ACC', 'ESC/ESH', 'Endocrine Society'" },
        "title": { "type": "string" },
        "year": { "type": "integer" },
        "recommendation": { "type": "string" },
        "grade": { "type": "string", "description": "e.g. 'I-A', 'IIa-B', 'Strong recommendation, moderate evidence'" },
        "url": { "type": "string", "format": "uri" }
      }
    },

    "interaction": {
      "type": "object",
      "required": ["drug_a", "drug_b", "severity", "source"],
      "properties": {
        "drug_a": { "type": "string" },
        "drug_a_type": { "type": "string", "enum": ["prescription", "otc", "supplement", "prn"] },
        "drug_b": { "type": "string" },
        "drug_b_type": { "type": "string", "enum": ["prescription", "otc", "supplement", "prn"] },
        "severity": {
          "type": "string",
          "enum": ["contraindicated", "major", "moderate", "minor"],
          "description": "MedPanel normalized severity"
        },
        "description": { "type": "string" },
        "clinical_consequence": { "type": "string" },
        "management": { "type": "string", "description": "Recommended management if interaction exists" },
        "source": {
          "type": "string",
          "enum": ["drugbank", "natural_medicines", "openfda_signal", "perplexity_search", "parametric"],
          "description": "Which database identified this interaction"
        },
        "source_confidence": {
          "type": "string",
          "enum": ["high", "moderate", "low"],
          "description": "How reliable is this source for interaction data"
        },
        "references": {
          "type": "array",
          "items": { "type": "string" },
          "description": "PMIDs or URLs supporting this interaction"
        }
      }
    }
  }
}
```

### What Goes Where: Evidence Distribution to Agents

```
Evidence Package
    |
    ├── shared_evidence ──────────► ALL specialist agents
    |                                (the core clinical question evidence)
    |
    ├── specialist_evidence ──────► ONLY the matching specialist
    |   ├── cardiologist ──────────► cardiologist agent only
    |   ├── endocrinologist ──────► endocrinologist agent only
    |   └── pharmacologist ────────► pharmacologist agent only
    |
    ├── drug_interactions ────────► ALL specialist agents
    |                                (but pharmacologist gets full detail,
    |                                 others get summary + critical items)
    |
    └── retrieval_status ─────────► ALL specialist agents
                                    (so they know what evidence is missing)
```

### Token Budget Management

Target: keep the evidence payload under 8,000 tokens per agent (leaves room for patient profile + system prompt + output in a 200K context window, while keeping costs controlled).

```typescript
const TOKEN_BUDGETS = {
  shared_evidence: 3000,       // ~3K tokens for shared citations + summary
  specialist_evidence: 3000,   // ~3K tokens for specialist-specific evidence
  drug_interactions: 1500,     // ~1.5K tokens for interaction data
  metadata_overhead: 500,      // ~500 tokens for retrieval status, package metadata
  total_per_agent: 8000,
};
```

**Truncation priority (lowest quality removed first):**
1. Remove `abstract_excerpt` from pubmed_metadata (saves ~200 tokens per citation)
2. Remove citations with `evidence_quality: "very_low"`
3. Remove citations with `verification_status: "not_found"` (keep the claim text, remove metadata)
4. Shorten `evidence_gaps` to top 3
5. Limit citations per query to top 8 (by evidence quality)
6. If still over budget: summarize remaining citations into a single paragraph (Haiku call)

---

## 7. Caching and Performance

### What Gets Cached

| Data | Cache Location | TTL | Invalidation |
|---|---|---|---|
| PubMed article metadata | Supabase `pubmed_cache` | 90 days | On retraction (checked weekly via NCBI retraction list) |
| RxNorm CUI mappings | Supabase `rxnorm_cache` | 180 days | RxNorm updates monthly; stale entries rarely matter |
| DrugBank interaction pairs | Supabase `interaction_cache` | 30 days | DrugBank updates quarterly; shorter TTL for safety |
| Perplexity results | NOT cached | N/A | Evidence must be fresh per consultation |
| Natural Medicines results | Supabase `supplement_interaction_cache` | 30 days | Same rationale as DrugBank |

### Cache Tables

```sql
-- RxNorm normalization cache
CREATE TABLE rxnorm_cache (
  input_name TEXT PRIMARY KEY,
  rxnorm_cui TEXT,
  rxnorm_name TEXT,
  match_type TEXT,  -- 'exact', 'approximate', 'not_found'
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '180 days')
);

-- Drug interaction cache
CREATE TABLE interaction_cache (
  cache_key TEXT PRIMARY KEY,  -- sorted pair: "drug_a|drug_b" (alphabetical)
  drug_a TEXT NOT NULL,
  drug_b TEXT NOT NULL,
  interactions JSONB,  -- array of interaction objects
  source TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_interaction_cache_expires ON interaction_cache(expires_at);

-- Supplement interaction cache (Natural Medicines DB)
CREATE TABLE supplement_interaction_cache (
  cache_key TEXT PRIMARY KEY,
  product_a TEXT NOT NULL,
  product_b TEXT NOT NULL,
  interactions JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);
```

### Cache Key Generation

```typescript
function interactionCacheKey(drugA: string, drugB: string): string {
  // Alphabetical sort ensures (A,B) and (B,A) hit the same cache entry
  const sorted = [drugA.toLowerCase().trim(), drugB.toLowerCase().trim()].sort();
  return `${sorted[0]}|${sorted[1]}`;
}
```

### Performance Targets

| Metric | Target | Degraded | Timeout |
|---|---|---|---|
| Full pipeline wall clock | < 8s | < 12s | 15s hard cutoff |
| Perplexity single query | < 5s | < 8s | 10s |
| PubMed batch verification | < 3s | < 5s | 5s |
| DrugBank interaction check | < 2s | < 4s | 5s |
| RxNorm normalization (per drug) | < 500ms | < 1s | 2s |
| Query generation (Haiku) | < 1s | < 2s | 3s |
| Citation parsing (Haiku) | < 1s | < 2s | 3s |

### Retraction Monitoring

Weekly cron job checks the NCBI retraction database:

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
  ?db=pubmed
  &term=retracted+publication[pt]
  &reldate=7
  &retmax=100
  &rettype=json
  &api_key={NCBI_API_KEY}
```

Any PMIDs found in our cache that appear in the retraction list get flagged:
```sql
UPDATE pubmed_cache
SET retracted = true, retracted_at = NOW()
WHERE pmid = ANY($1);
```

Retracted citations in future evidence packages get `"verification_note": "RETRACTED — this study has been retracted"` and `evidence_quality` is forced to `"very_low"`.

---

## 8. Error Handling -- Complete Degradation Matrix

### Principle: Always proceed. Never block a consultation because an API is down. Degrade gracefully and be transparent about what is missing.

### Perplexity API Down

```typescript
async function retrieveEvidence(query: string): Promise<EvidenceResult> {
  try {
    return await callPerplexity(query);
  } catch (error) {
    if (isRateLimitError(error)) {
      // Wait and retry once
      await delay(2000);
      return await callPerplexity(query);
    }

    // Perplexity unavailable — fall back to direct search
    console.warn(`Perplexity failed: ${error.message}. Falling back.`);

    const [pubmedResults, semanticScholarResults] = await Promise.allSettled([
      fallbackPubMedSearch(query),
      fallbackSemanticScholarSearch(query),
    ]);

    return assembleFallbackEvidence(pubmedResults, semanticScholarResults);
  }
}
```

**Fallback: Direct PubMed Search**

```
GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
  ?db=pubmed
  &term=telmisartan+vs+lisinopril+hypertension+testosterone
  &retmax=10
  &sort=relevance
  &rettype=json
  &api_key={NCBI_API_KEY}
```

Then fetch abstracts for the returned PMIDs via efetch. Less synthesized than Perplexity, but real citations.

**Fallback: Semantic Scholar**

```
GET https://api.semanticscholar.org/graph/v1/paper/search
  ?query=telmisartan+lisinopril+comparative+effectiveness+testosterone
  &limit=10
  &fields=title,authors,year,abstract,citationCount,influentialCitationCount,journal,externalIds
```

Semantic Scholar provides influence scores and citation counts, useful for ranking results.

**Fallback evidence gets tagged:**
```json
{
  "retrieval_method": "fallback_direct_search",
  "note": "Primary evidence service (Perplexity) unavailable. Results from direct PubMed + Semantic Scholar search. No AI synthesis available — agents must interpret raw abstracts.",
  "quality_impact": "Evidence may be less comprehensive than normal. Agents should rely more on parametric knowledge and flag lower confidence."
}
```

### DrugBank API Down

```typescript
async function checkInteractions(meds: NormalizedMedication[]): Promise<InteractionResult> {
  try {
    return await callDrugBank(meds);
  } catch (error) {
    console.warn(`DrugBank failed: ${error.message}`);

    // Try OpenFDA as partial fallback
    try {
      const openfdaResults = await checkOpenFDAInteractions(meds);
      return {
        interactions: openfdaResults,
        source: "openfda_fallback",
        confidence: "low",
        note: "DrugBank unavailable. Using OpenFDA adverse event data as proxy. Results are signal-based, not curated interaction data. Agents should treat all interaction findings as unverified."
      };
    } catch {
      // Both down
      return {
        interactions: [],
        source: "none",
        confidence: "none",
        note: "All interaction databases unavailable. Agents must rely on parametric knowledge for interaction checking. ALL interactions should be flagged as 'unverified — database unavailable'."
      };
    }
  }
}
```

### PubMed Verification Timeout

```typescript
async function verifyWithTimeout(pmids: string[]): Promise<VerificationResult[]> {
  try {
    const result = await Promise.race([
      batchVerifyPMIDs(pmids),
      timeout(5000),  // 5 second hard timeout
    ]);
    return result;
  } catch {
    // Timeout or error — mark all as unverified, don't block pipeline
    return pmids.map(pmid => ({
      pmid,
      status: "verification_failed",
      note: "PubMed verification timed out. Citation retained but unverified.",
    }));
  }
}
```

### Complete Failure: All APIs Down

This is the worst case. The pipeline still produces an evidence package, but it is mostly empty.

```json
{
  "package_id": "uuid",
  "consultation_id": "uuid",
  "generated_at": "2026-03-24T12:00:00Z",
  "retrieval_status": {
    "overall": "unavailable",
    "perplexity": "error",
    "pubmed_verification": "skipped",
    "drugbank": "error",
    "rxnorm": "error",
    "errors": [
      { "step": "perplexity", "error": "Connection timeout after 10s", "fallback_used": "pubmed_direct_search" },
      { "step": "pubmed_fallback", "error": "Connection timeout after 5s", "fallback_used": "none" },
      { "step": "drugbank", "error": "503 Service Unavailable", "fallback_used": "openfda" },
      { "step": "openfda_fallback", "error": "Connection timeout after 5s", "fallback_used": "none" }
    ],
    "wall_clock_ms": 15000
  },
  "shared_evidence": {
    "query_used": "...",
    "summary": null,
    "citations": [],
    "guidelines": [],
    "evidence_gaps": ["EVIDENCE RETRIEVAL UNAVAILABLE — all external evidence services failed during this consultation. Agent responses are based entirely on parametric training knowledge and should be treated with additional caution."]
  },
  "specialist_evidence": {},
  "drug_interactions": {
    "medications_checked": [],
    "interactions_found": [],
    "pairs_with_no_data": [],
    "critical_interactions_count": 0,
    "total_interactions_count": 0
  }
}
```

**Agent behavior when evidence is unavailable:**
- Every agent's system prompt includes: "If evidence_package.retrieval_status.overall is 'unavailable', you MUST prominently state at the top of your assessment that external evidence retrieval failed, and your analysis relies on training knowledge only."
- Confidence levels automatically cap at `"moderate"` when no external evidence is available.
- The moderator adds a banner to the final output: "External evidence sources were unavailable during this consultation. All specialist perspectives are based on training knowledge and should be independently verified."

### Degradation Summary Matrix

| Scenario | Pipeline Result | Agent Confidence Cap | User-Visible Warning |
|---|---|---|---|
| All services healthy | `complete` | No cap | None |
| Perplexity down, fallbacks work | `partial` | No cap | "Some evidence retrieved via backup sources" |
| Perplexity + fallbacks down | `degraded` | `moderate` | "Evidence retrieval limited — verify findings independently" |
| DrugBank down, OpenFDA works | `partial` | No cap on evidence, interactions flagged `low` | "Drug interactions from backup source — verify with pharmacist" |
| All interaction DBs down | `degraded` | No cap on evidence, interactions capped at `low` | "Drug interaction checking unavailable — consult pharmacist" |
| PubMed verification timeout | `partial` | No cap | "Some citations unverified" |
| Everything down | `unavailable` | `moderate` | "Evidence retrieval unavailable — responses based on AI training knowledge only" |

---

## 9. Implementation Checklist

### Phase 1: Core Pipeline (MVP)
- [ ] Perplexity Sonar Pro integration (single shared query)
- [ ] Citation extraction via Haiku post-processing
- [ ] PubMed PMID verification (efetch batch)
- [ ] RxNorm medication normalization
- [ ] Evidence package assembly (shared evidence only)
- [ ] Basic error handling (timeouts, retries)
- [ ] Evidence package JSON schema validation

### Phase 2: Specialist Evidence + Interactions
- [ ] Specialist-specific Perplexity queries (parallel)
- [ ] DrugBank interaction checking
- [ ] OpenFDA fallback for interactions
- [ ] Supplement gap handling (Perplexity fallback queries)
- [ ] Evidence distribution (shared vs. specialist-specific)
- [ ] Token budget management and truncation

### Phase 3: Caching + Performance
- [ ] PubMed metadata cache (Supabase)
- [ ] RxNorm normalization cache
- [ ] Interaction pair cache
- [ ] Retraction monitoring cron job
- [ ] Performance monitoring and alerting
- [ ] Cache hit rate tracking

### Phase 4: Advanced
- [ ] Natural Medicines Database integration (subscription dependent)
- [ ] Semantic Scholar fallback
- [ ] ClinicalTrials.gov integration (active trials for the condition)
- [ ] Evidence quality trend tracking (are our citations getting better over time?)
- [ ] A/B testing: Perplexity Sonar Pro vs Deep Research for complex queries

---

## 10. Cost Model

### Per-Consultation Evidence Costs

| Component | Simple (2 spec) | Moderate (3 spec) | Complex (5 spec) |
|---|---|---|---|
| Query generation (Haiku) | $0.001 | $0.001 | $0.002 |
| Perplexity Sonar Pro | $0.10 | $0.15 | $0.25 |
| Citation parsing (Haiku) | $0.003 | $0.005 | $0.008 |
| PubMed E-utilities | Free | Free | Free |
| RxNorm API | Free | Free | Free |
| DrugBank API | Subscription | Subscription | Subscription |
| OpenFDA API | Free | Free | Free |
| **Total evidence pipeline** | **~$0.10** | **~$0.16** | **~$0.26** |

Evidence retrieval is roughly 5-10% of total consultation cost (the bulk is Opus specialist calls).

### Monthly Estimates

| Volume | Evidence Pipeline Cost | Total Consultation Cost |
|---|---|---|
| 100 consultations/mo | ~$15 | ~$300-800 |
| 500 consultations/mo | ~$75 | ~$1,500-4,000 |
| 1,000 consultations/mo | ~$150 | ~$3,000-8,000 |

Plus DrugBank subscription (~$170/mo) and Natural Medicines (~$35/mo) as fixed costs.

---

## 11. TypeScript Interface Summary

For implementation reference. These are the key types the pipeline code works with.

```typescript
// Pipeline input
interface EvidencePipelineInput {
  consultation_id: string;
  classification: ConsultationClassification;
  patient_profile: PatientProfile;
  specialists_selected: string[];
}

// Pipeline output
interface EvidencePackage {
  package_id: string;
  consultation_id: string;
  generated_at: string;
  retrieval_status: RetrievalStatus;
  shared_evidence: EvidenceBlock;
  specialist_evidence: Record<string, EvidenceBlock>;
  drug_interactions: DrugInteractionReport;
  token_budget: TokenBudget;
}

// Main orchestrator
async function runEvidencePipeline(
  input: EvidencePipelineInput
): Promise<EvidencePackage> {

  const startTime = Date.now();
  const HARD_TIMEOUT = 15_000;

  // Step 1: Generate queries
  const queries = await generateQueries(input);

  // Steps 2-5: Run in parallel tracks
  const [evidenceTrack, interactionTrack] = await Promise.allSettled([
    // Track A: Perplexity → PubMed verification
    retrieveAndVerifyEvidence(queries),
    // Track B: RxNorm → DrugBank/NM
    normalizeAndCheckInteractions(input.patient_profile.medications),
  ]);

  // Step 6: Assemble package
  const package = assembleEvidencePackage(
    input,
    evidenceTrack,
    interactionTrack,
    Date.now() - startTime,
  );

  // Validate against JSON schema
  validateEvidencePackage(package);

  return package;
}
```

---

## 12. Security and Privacy Notes

- **No patient PII in Perplexity queries.** Queries contain only de-identified clinical parameters (age, sex, condition names, medication names). Never include names, dates of birth, or other identifiers.
- **DrugBank receives medication names only.** No patient context.
- **PubMed receives PMIDs only.** No patient data.
- **RxNorm receives drug names only.** No patient data.
- **Evidence package stored in Supabase** with the same RLS policies as consultation data. EU region.
- **Cache tables contain no patient data** -- only medical reference data (drug names, PMIDs, interaction data).
