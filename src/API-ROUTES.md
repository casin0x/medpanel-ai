# MedPanel AI -- API Routes Specification

Phase 3.3: Complete API route definitions for the Next.js App Router backend.

Every route lives under `src/app/api/`. All routes return JSON. All authenticated routes require a valid Supabase JWT in the `Authorization: Bearer <token>` header. Row Level Security (RLS) enforces that users can only access their own data.

---

## Route Index

| # | Method | Path | Auth | Spec Source |
|---|--------|------|------|-------------|
| 1 | POST | `/api/auth/signup` | Public | Supabase Auth |
| 2 | POST | `/api/auth/login` | Public | Supabase Auth |
| 3 | POST | `/api/profiles` | Authenticated | `patient-profile.json` |
| 4 | GET | `/api/profiles/:id` | Authenticated + Owner | `patient-profile.json` |
| 5 | POST | `/api/consult` | Authenticated | `DISCUSSION-PROTOCOL.md`, `consultation.json` |
| 6 | GET | `/api/consult/:id` | Authenticated + Owner | `consultation.json` |
| 7 | GET | `/api/consult/:id/stream` | Authenticated + Owner | SSE spec below |
| 8 | POST | `/api/consult/:id/followup` | Authenticated + Owner | `consultation.json` follow_ups |
| 9 | POST | `/api/consult/:id/outcome` | Authenticated + Owner | `DISCUSSION-PROTOCOL.md` Section 2 |
| 10 | GET | `/api/history` | Authenticated | `consultation.json` |
| 11 | GET | `/api/labs` | Authenticated | `DISCUSSION-PROTOCOL.md` lab_history table |
| 12 | POST | `/api/labs` | Authenticated | `DISCUSSION-PROTOCOL.md` lab_history table |

---

## 1. POST /api/auth/signup

Creates a new user account via Supabase Auth.

**Auth:** Public

**Request Body:**

```typescript
interface SignupRequest {
  email: string;          // Valid email format
  password: string;       // Minimum 8 characters
  name?: string;          // Display name
  country?: string;       // For locale-aware safety responses (911 vs 112 vs 999)
}
```

**Response 201:**

```typescript
interface SignupResponse {
  user: {
    id: string;           // UUID
    email: string;
    created_at: string;   // ISO 8601
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;   // Unix timestamp
  };
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `INVALID_EMAIL` | Email format invalid |
| 400 | `WEAK_PASSWORD` | Password does not meet requirements |
| 409 | `EMAIL_EXISTS` | Account already exists for this email |
| 429 | `RATE_LIMITED` | Too many signup attempts |
| 500 | `AUTH_SERVICE_ERROR` | Supabase Auth unavailable |

---

## 2. POST /api/auth/login

Authenticates an existing user and returns a session.

**Auth:** Public

**Request Body:**

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response 200:**

```typescript
interface LoginResponse {
  user: {
    id: string;
    email: string;
    has_profile: boolean;  // Whether patient profile exists
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `INVALID_CREDENTIALS` | Email or password incorrect |
| 429 | `RATE_LIMITED` | Too many login attempts (5 per minute) |
| 500 | `AUTH_SERVICE_ERROR` | Supabase Auth unavailable |

---

## 3. POST /api/profiles

Creates or updates the patient profile for the authenticated user. Versioned -- every update increments `profile_version`. Consultations reference a specific version so historical consultations remain stable.

**Auth:** Authenticated (JWT)

**Spec:** `schemas/patient-profile.json`

**Request Body:**

```typescript
interface ProfileUpsertRequest {
  // Required fields (critical for any consultation)
  demographics: {
    age: number;             // 0-120
    sex: 'male' | 'female' | 'other';
    height_cm?: number;
    weight_kg?: number;
    ethnicity?: string;
    country?: string;
  };

  // Medical data
  conditions?: Condition[];   // $ref shared-definitions.json#/$defs/condition
  medications?: Medication[]; // $ref shared-definitions.json#/$defs/medication
  allergies?: Allergy[];
  lab_results?: LabResult[];  // $ref shared-definitions.json#/$defs/lab_result

  // Extended (helpful but not required)
  vitals?: {
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    resting_heart_rate?: number;
  };
  family_history?: FamilyHistoryEntry[];
  lifestyle?: {
    exercise_frequency?: string;
    diet_type?: string;
    alcohol_use?: string;
    tobacco_use?: string;
    sleep_hours?: number;
    stress_level?: string;
  };
  goals?: string[];
}
```

**Server-side processing:**

1. Validate against `patient-profile.json` schema (Zod)
2. Normalize medications via RxNorm API (async, best-effort)
3. Compute BMI if height + weight provided
4. Run `score_completeness(profile)` from DISCUSSION-PROTOCOL.md
5. Increment `profile_version`
6. Store in Supabase with RLS (user can only access own profile)

**Response 200 (update) / 201 (create):**

```typescript
interface ProfileResponse {
  profile_id: string;            // UUID
  profile_version: number;
  completeness: {
    score: number;               // 0.0 - 1.0
    gaps: CompletionGap[];       // { field, category, weight }
    proceed: boolean;            // Can consultations run with this profile?
  };
  medications_normalized: {
    normalized: number;          // Count of medications with RxNorm match
    total: number;
    failed: string[];            // Medication names that failed normalization
  };
  updated_at: string;
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Body does not match patient-profile.json schema. Returns `details: ValidationError[]` |
| 400 | `IMPLAUSIBLE_DATA` | Biologically implausible values detected (validate_patient_data). Returns `anomalies: Anomaly[]` |
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |
| 500 | `PROFILE_SAVE_ERROR` | Database write failed |

---

## 4. GET /api/profiles/:id

Retrieves the patient profile. The `:id` is the `profile_id` UUID.

**Auth:** Authenticated + Owner (RLS enforced)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `version` | integer | latest | Specific profile version to retrieve |

**Response 200:**

```typescript
interface ProfileDetailResponse {
  profile_id: string;
  profile_version: number;
  created_at: string;
  updated_at: string;
  demographics: Demographics;
  conditions: Condition[];
  medications: Medication[];     // Includes rxnorm_cui and rxnorm_name if normalized
  allergies: Allergy[];
  lab_results: LabResult[];
  vitals?: Vitals;
  family_history?: FamilyHistoryEntry[];
  lifestyle?: Lifestyle;
  goals?: string[];
  completeness: CompletenessScore;
  data_quality: {
    anomalies: Anomaly[];        // From validate_patient_data()
    action: 'PROCEED' | 'PROCEED_WITH_WARNINGS' | 'BLOCK_AND_QUERY_USER';
  };
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |
| 403 | `FORBIDDEN` | Profile belongs to another user |
| 404 | `NOT_FOUND` | Profile ID does not exist |
| 404 | `VERSION_NOT_FOUND` | Requested version does not exist |

---

## 5. POST /api/consult

**The main endpoint.** Starts a new multi-specialist consultation. This is a long-running operation (30-120 seconds). The response returns immediately with a `consultation_id`; the client connects to the SSE stream at `/api/consult/:id/stream` to receive real-time progress updates.

**Auth:** Authenticated (JWT)

**Spec:** `DISCUSSION-PROTOCOL.md` (complete orchestration flow), `consultation.json`, `QUESTION-CLASSIFICATION.md`, `EVIDENCE-PIPELINE.md`, `SAFETY-SYSTEM.md`

**Request Body:**

```typescript
interface ConsultationRequest {
  question: string;            // Minimum 10 characters
  context?: string;            // Additional context the user wants to provide
  profile_id: string;          // UUID of the patient profile to use
  options?: {
    enhanced_reliability?: boolean;  // 3x run mode (consensus_across_runs). Costs 3x.
    max_budget_usd?: number;         // User-set ceiling (capped by tier max)
    preferred_specialists?: SpecialistType[];  // Hint, not guarantee
  };
}
```

**Immediate Response 202 (Accepted):**

```typescript
interface ConsultationAcceptedResponse {
  consultation_id: string;     // UUID
  status: 'classifying';       // Initial status
  stream_url: string;          // /api/consult/{id}/stream
  estimated_duration_seconds: number;  // Rough estimate based on question complexity
  budget_tier: {
    tier: 'simple' | 'moderate' | 'complex';  // Determined after classification
    max_cost_usd: number;
  };
}
```

**Error Responses (synchronous, before orchestration starts):**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `QUESTION_TOO_SHORT` | Question under 10 characters |
| 400 | `PROFILE_INCOMPLETE` | Profile has critical gaps (completeness.proceed === false) |
| 400 | `IMPLAUSIBLE_DATA` | Profile has critical anomalies that must be resolved first |
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |
| 404 | `PROFILE_NOT_FOUND` | profile_id does not exist or belongs to another user |
| 429 | `RATE_LIMITED` | Too many consultations (3 per hour, 10 per day) |
| 503 | `SERVICE_UNAVAILABLE` | LLM provider or evidence APIs are down |

### Complete Orchestration Flow

When the request is accepted (202), the orchestrator runs the following pipeline asynchronously. Each phase emits SSE events to the stream endpoint.

```
Phase 1: SAFETY PRE-CHECK                              ~10ms
├── Run Stage 1 regex patterns from SAFETY-SYSTEM.md
├── If EMERGENCY match → run Stage 3 LLM classification
├── If TRUE_EMERGENCY → abort, return emergency response, status = 'completed'
├── If TRUE_URGENT → set urgency flag, continue with safety wrapper
├── SSE: { event: 'safety_check', data: { passed: true, urgency: 'routine' } }
│
Phase 2: CLASSIFICATION                                 ~1-2s
├── Call Haiku classifier (prompts/classifier.md)
├── Input: de-identified question + profile summary
├── Output: intent, domains[], urgency, complexity_score (0-10)
├── Determine budget tier from complexity_score:
│   ├── 0.0-2.5 → simple  (max $5, max 60K tokens)
│   ├── 2.6-6.5 → moderate (max $15, max 200K tokens)
│   └── 6.6-10  → complex  (max $25, max 400K tokens)
├── Run specialist selection algorithm (DISCUSSION-PROTOCOL.md 1a)
├── Assign model tiers per specialist
├── SSE: { event: 'classified', data: { intent, domains, complexity, specialists[] } }
│
Phase 3: EVIDENCE RETRIEVAL                             ~8-15s
├── Run evidence pipeline (EVIDENCE-PIPELINE.md)
│   ├── Step 1: Query generation (Haiku) → 2-5 search queries
│   ├── Step 2+3: Perplexity → PubMed verification   ─┐
│   ├── Step 4+5: RxNorm → DrugBank interactions      ─┤ parallel
│   └── Step 6: Evidence package assembly              ─┘
├── Hard timeout: 15 seconds. Whatever is ready gets packaged.
├── Missing pieces flagged with retrieval_step_status
├── SSE: { event: 'evidence_ready', data: { citations_count, interactions_count, status } }
│
Phase 4: ROUND 1 -- INDEPENDENT ANALYSIS               ~15-30s
├── Load specialist prompts from prompts/*.md
├── Parameterize with {patient_context} and {evidence_package}
├── Call all specialists in PARALLEL (Promise.all with per-agent timeout 60s)
│   ├── Each agent: prompt + shared_context + specialist_context + outcome_history
│   ├── Temperature: 0.3
│   ├── Max output tokens: 3000 per agent
│   ├── Validate output against agent-output.json round_1_output schema
│   ├── If validation fails: retry once (max 2 total attempts)
│   └── If agent times out or fails both attempts: mark as failed, continue without
├── Post-Round-1: detect_cross_domain_harm()
├── Record token usage + cost in budget tracker
├── SSE: { event: 'round_1_complete', data: { agents_completed, agents_failed, findings_count } }
│   Per-agent SSE during round: { event: 'agent_started', data: { specialist, model } }
│                                { event: 'agent_complete', data: { specialist, findings, time_ms } }
│
Phase 5: BUDGET CHECK #1
├── track_budget(state)
├── If HARD_STOP → skip to Phase 8 (emergency synthesis)
├── If DEGRADE → apply degradation strategy (downgrade models, reduce token limits)
├── If WARN → log, reduce Round 3 budget
├── SSE: { event: 'budget_update', data: { spent_usd, remaining_usd, action } }
│
Phase 6: ROUND 2 -- CROSS-EXAMINATION                  ~20-40s
├── Each agent receives: own Round 1 output + ALL other Round 1 outputs + detected conflicts
├── Call all specialists in PARALLEL
│   ├── Temperature: 0.4
│   ├── Max output tokens: 2000 per agent
│   ├── Validate against agent-output.json round_2_output schema
│   └── Same retry + timeout logic as Round 1
├── Post-Round-2: check termination conditions (should_terminate)
├── Post-Round-2: detect_false_consensus() → optional devil's advocate pass
├── SSE: { event: 'round_2_complete', data: { agreements, disagreements, unresolved_count } }
│
Phase 7: ROUND 3 -- FOCUSED RESOLUTION (conditional)   ~10-20s
├── Triggers ONLY if:
│   ├── unresolved_disagreements with requires_round_3 === true exist
│   ├── Disagreement involves severity >= 'moderate'
│   └── Budget has not exceeded 80% ceiling
├── ONLY involved agents participate (not all specialists)
├── Each agent gets the specific disagreement to resolve
│   ├── Temperature: 0.2
│   ├── Max output tokens: 500
│   ├── Scope: ONLY the disagreement. No new topics.
│   └── New concerns → deferred_concerns queue, stripped from output
├── SSE: { event: 'round_3_complete', data: { resolutions[], deferred_concerns[] } }
│   Or: { event: 'round_3_skipped', data: { reason } }
│
Phase 8: SYNTHESIS                                      ~5-10s
├── Call Sonnet moderator (prompts/moderator.md)
├── Input: all round outputs + conflicts + false_consensus_flags + data_anomalies
├── Output: structured synthesis (consensus areas, disagreement areas, decision frameworks)
├── Generate patient-mode output (Flesch-Kincaid 60-70, 5th-6th grade reading level)
├── Generate physician-mode output (clinical language, GRADE ratings, full citations)
├── SSE: { event: 'synthesis_complete', data: { consensus_reached, recommendation_count } }
│
Phase 9: SAFETY POST-CHECK                             ~2-5s
├── Run Haiku safety check on the complete synthesis
├── Verify: no dangerous dosing, no contraindicated interactions missed
├── Cross-check critical claims against DrugBank
├── Apply safety wrappers from SAFETY-SYSTEM.md (urgent/caution levels)
├── SSE: { event: 'safety_verified', data: { flags_count, urgency } }
│
Phase 10: STORE + FINALIZE                             ~1-2s
├── Store complete consultation in Supabase (consultations table)
├── Extract recommendations → recommendations table
├── Schedule follow-ups (schedule_followups from DISCUSSION-PROTOCOL.md)
├── Compute quality metrics (value_added, diversity, information_gain)
├── Generate summary_hash (SHA-256 of deterministic components)
├── Store in lab_history if new lab results were part of context
├── SSE: { event: 'completed', data: { consultation_id, synthesis, cost, quality_metrics } }
├── Status transitions to 'completed'
│
ERROR HANDLING (any phase):
├── If a phase fails after retries → emit error SSE, attempt to proceed
├── If classification fails → cannot continue, status = 'failed'
├── If all specialists fail → cannot continue, status = 'failed'
├── If >= 1 specialist succeeds → synthesize with available outputs
├── Timeout: total consultation hard timeout = 600 seconds (10 minutes)
│   └── If hit → synthesize whatever is available, flag as 'budget_limited_incomplete_consensus'
├── SSE: { event: 'error', data: { phase, message, recoverable } }
```

### SSE Event Schema

All SSE events follow this structure:

```typescript
interface SSEEvent {
  event: string;       // Event type name
  data: {
    phase: ConsultationStatus;  // Current consultation status enum value
    timestamp: string;          // ISO 8601
    payload: Record<string, unknown>;  // Phase-specific data
  };
  id?: string;         // Event ID for reconnection (monotonically increasing)
  retry?: number;      // Reconnection interval in ms (default: 3000)
}
```

Complete event type registry:

```typescript
type SSEEventType =
  | 'safety_check'        // Phase 1: safety pre-check result
  | 'classified'          // Phase 2: classification complete
  | 'evidence_progress'   // Phase 3: incremental evidence retrieval updates
  | 'evidence_ready'      // Phase 3: evidence package assembled
  | 'agent_started'       // Phase 4-7: individual agent begins processing
  | 'agent_complete'      // Phase 4-7: individual agent finished
  | 'agent_failed'        // Phase 4-7: individual agent failed after retries
  | 'round_1_complete'    // Phase 4: all Round 1 agents done
  | 'budget_update'       // Phase 5: budget checkpoint
  | 'round_2_complete'    // Phase 6: all Round 2 agents done
  | 'round_3_complete'    // Phase 7: Round 3 done (or skipped)
  | 'round_3_skipped'     // Phase 7: Round 3 not triggered
  | 'synthesis_complete'  // Phase 8: moderator synthesis done
  | 'safety_verified'     // Phase 9: post-synthesis safety check done
  | 'completed'           // Phase 10: consultation stored, final result available
  | 'error'               // Any phase: recoverable or fatal error
  | 'heartbeat';          // Every 15 seconds during processing (keeps connection alive)
```

### Cost Tracking

Every LLM call records:

```typescript
interface CostRecord {
  phase: string;             // 'classification' | 'evidence_query_gen' | 'round_1' | 'round_2' | 'round_3' | 'synthesis' | 'safety_check' | 'devils_advocate'
  agent_id?: string;         // e.g., 'endocrinologist_001'
  model: string;             // e.g., 'claude-opus-4-6'
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;          // Calculated: (input_tokens * input_rate + output_tokens * output_rate) / 1_000_000
  latency_ms: number;
  timestamp: string;
}
```

Model cost rates (per 1M tokens):

```typescript
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':    { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':  { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':   { input: 0.80,  output: 4.00 },
  'gpt-4.1':            { input: 2.00,  output: 8.00 },
  'sonar-pro':          { input: 3.00,  output: 15.00 },
};
```

### Timeout Handling

| Scope | Timeout | On Timeout |
|-------|---------|------------|
| Single agent call | 60 seconds | Retry once with Sonnet fallback model. If still fails, mark agent as failed, proceed without. |
| Evidence pipeline | 15 seconds | Package whatever evidence is available. Missing pieces flagged as `retrieval_timeout`. |
| Single round (all agents) | 180 seconds | Cancel remaining agents. Proceed with completed outputs. |
| Total consultation | 600 seconds | Emergency synthesis of all available data. Status = `completed` with `termination_reason: 'emergency_synthesis'`. |
| SSE connection | 30 seconds idle | Send heartbeat event. If client disconnects, orchestration continues; result is retrievable via GET. |

---

## 6. GET /api/consult/:id

Retrieves a completed (or in-progress) consultation result.

**Auth:** Authenticated + Owner (RLS enforced)

**Response 200:**

```typescript
interface ConsultationResponse {
  consultation_id: string;
  user_id: string;
  status: ConsultationStatus;     // shared-definitions.json#/$defs/consultation_status
  created_at: string;
  completed_at?: string;

  question: {
    text: string;
    context?: string;
  };

  classification?: {              // Present after classification phase
    intent: ConsultationType;
    domains: Domain[];
    urgency: Urgency;
    complexity_score: number;
    specialists: SpecialistType[];
  };

  evidence_summary?: {            // Present after evidence retrieval
    total_citations: number;
    verified_citations: number;
    interactions_found: number;
    retrieval_status: RetrievalOverallStatus;
  };

  specialist_outputs?: AgentOutput[];  // Present after Round 1+

  synthesis?: {                   // Present after synthesis phase
    consensus_areas: ConsensusItem[];
    disagreement_areas: DisagreementItem[];
    recommendations: Recommendation[];
    questions_for_doctor: string[];
    deferred_concerns: DeferredConcern[];
    output_patient_mode: string;
    output_physician_mode: string;
  };

  discussion_metadata: {
    total_rounds: number;
    termination_reason?: TerminationReason;
    total_tokens_used: number;
    total_cost_usd: number;
    budget_tier: BudgetTier;
    models_used: Record<string, string>;
  };

  quality_metrics?: {
    value_added_score: number;
    diversity_score: number;
    information_gain_per_round: number[];
  };

  safety: {
    urgency: Urgency;
    flags: SafetyFlag[];
    wrappers_applied: string[];   // Which safety wrapper templates were applied
  };

  follow_ups: FollowUp[];
  outcome_tracking: OutcomeReport[];
  followup_schedule: FollowupScheduleEntry[];
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |
| 403 | `FORBIDDEN` | Consultation belongs to another user |
| 404 | `NOT_FOUND` | Consultation ID does not exist |

---

## 7. GET /api/consult/:id/stream

Server-Sent Events stream for real-time consultation progress. The client connects after receiving the 202 from POST /api/consult.

**Auth:** Authenticated + Owner (JWT passed as query parameter `?token=<jwt>` since SSE does not support custom headers)

**Response:** `Content-Type: text/event-stream`

**Connection Lifecycle:**

1. Client connects with `EventSource` or fetch API
2. Server sends events as the orchestrator progresses through phases
3. Server sends `heartbeat` every 15 seconds to keep connection alive
4. Server sends `completed` or `error` (fatal) as the final event
5. Server closes the connection after the final event

**Reconnection:**

Each event includes an `id` field (monotonically increasing integer). If the client reconnects with `Last-Event-ID`, the server replays missed events from the stored event log for this consultation.

**Example event stream:**

```
id: 1
event: safety_check
data: {"phase":"classifying","timestamp":"2026-03-24T14:30:00.100Z","payload":{"passed":true,"urgency":"routine"}}

id: 2
event: classified
data: {"phase":"retrieving_evidence","timestamp":"2026-03-24T14:30:01.500Z","payload":{"intent":"medication_management","domains":["CARDIO","ENDO"],"complexity_score":6.5,"specialists":["internist","cardiologist","endocrinologist","clinical_pharmacologist"]}}

id: 3
event: evidence_progress
data: {"phase":"retrieving_evidence","timestamp":"2026-03-24T14:30:05.000Z","payload":{"step":"perplexity_complete","citations_found":12}}

id: 4
event: evidence_ready
data: {"phase":"specialists_analyzing","timestamp":"2026-03-24T14:30:09.200Z","payload":{"citations_count":12,"verified_count":10,"interactions_count":2,"status":"complete"}}

id: 5
event: agent_started
data: {"phase":"specialists_analyzing","timestamp":"2026-03-24T14:30:09.300Z","payload":{"specialist":"internist","model":"claude-opus-4-6"}}

id: 6
event: agent_started
data: {"phase":"specialists_analyzing","timestamp":"2026-03-24T14:30:09.300Z","payload":{"specialist":"cardiologist","model":"claude-opus-4-6"}}

id: 7
event: agent_complete
data: {"phase":"specialists_analyzing","timestamp":"2026-03-24T14:30:22.100Z","payload":{"specialist":"internist","findings_count":4,"recommendations_count":3,"time_ms":12800}}

id: 8
event: heartbeat
data: {"phase":"specialists_analyzing","timestamp":"2026-03-24T14:30:24.300Z","payload":{}}

id: 15
event: completed
data: {"phase":"completed","timestamp":"2026-03-24T14:31:45.000Z","payload":{"consultation_id":"uuid","consensus_reached":true,"total_cost_usd":8.42,"recommendation_count":7}}

```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Invalid or missing token query parameter |
| 403 | `FORBIDDEN` | Consultation belongs to another user |
| 404 | `NOT_FOUND` | Consultation ID does not exist |
| 409 | `ALREADY_COMPLETED` | Consultation already finished; use GET /api/consult/:id instead |

---

## 8. POST /api/consult/:id/followup

Asks a follow-up question on a completed consultation. The follow-up is scoped to the original consultation context -- specialists are not re-invoked. A single Sonnet call generates the response using the existing synthesis + evidence package.

**Auth:** Authenticated + Owner

**Request Body:**

```typescript
interface FollowupRequest {
  question: string;    // The follow-up question (minimum 5 characters)
}
```

**Server-side processing:**

1. Load the original consultation (synthesis + evidence_package + specialist_outputs)
2. Safety pre-check on the follow-up question
3. If emergency → return emergency response
4. Call Sonnet with: original synthesis + evidence package + follow-up question
5. Validate response, apply safety wrappers if needed
6. Append to consultation.follow_ups array
7. Track cost (adds to consultation total)

**Response 200:**

```typescript
interface FollowupResponse {
  response: string;               // The follow-up answer
  safety: {
    urgency: Urgency;
    flags: SafetyFlag[];
  };
  cost_usd: number;               // Cost of this follow-up call
  timestamp: string;
  follow_up_count: number;        // How many follow-ups on this consultation (max 10)
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `QUESTION_TOO_SHORT` | Under 5 characters |
| 400 | `CONSULTATION_NOT_COMPLETE` | Original consultation is still running |
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |
| 403 | `FORBIDDEN` | Consultation belongs to another user |
| 404 | `NOT_FOUND` | Consultation ID does not exist |
| 429 | `FOLLOWUP_LIMIT` | Maximum 10 follow-ups per consultation reached |

---

## 9. POST /api/consult/:id/outcome

Reports an outcome for one or more recommendations from a consultation. Implements the outcome reporting flow from DISCUSSION-PROTOCOL.md Section 2b.

**Auth:** Authenticated + Owner

**Request Body:**

```typescript
interface OutcomeReportRequest {
  outcomes: OutcomeEntry[];
}

interface OutcomeEntry {
  recommendation_id: string;     // R-ENDO-001 etc. (from specialist_outputs)

  // Step 1: Adherence
  adherence: 'full' | 'partial' | 'none' | 'unknown';
  alternative_chosen?: string;   // If adherence is 'none', what they did instead

  // Step 2: Subjective outcome
  outcome: 'improved' | 'unchanged' | 'worsened' | 'not_followed' | 'chose_different_approach' | 'pending';
  outcome_details?: string;      // Free text
  severity_if_worsened?: Severity;

  // Step 3: Confounders
  confounders?: string[];        // medication_change, supplement_change, diet_change, etc.

  // Step 4: New lab results (optional)
  new_lab_results?: LabResult[];

  // Meta
  reporting_method: 'self_report' | 'lab_verified' | 'clinician_verified';
  confidence_in_report?: number; // 0.0-1.0, user self-rated
}
```

**Server-side processing:**

1. Validate recommendation_id exists in the consultation
2. Store in outcome_reports table
3. If new_lab_results provided → run auto_compare_labs() from DISCUSSION-PROTOCOL.md
4. Update lab_history table with new values
5. Mark relevant followup_schedule entries as completed
6. If severity_if_worsened is 'critical' or 'high' → trigger safety escalation review

**Response 200:**

```typescript
interface OutcomeReportResponse {
  recorded: number;              // Number of outcomes successfully recorded
  lab_comparison?: {             // Only if new_lab_results were provided
    comparison: LabComparison[];
    summary: string;             // Human-readable summary of changes
    linked_recommendations: Record<string, string>;  // lab_test -> recommendation_id
  };
  followups_completed: number;   // How many scheduled follow-ups were marked done
  next_followup?: {
    scheduled_at: string;
    type: string;
    message: string;
  };
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Body does not match schema |
| 400 | `INVALID_RECOMMENDATION` | recommendation_id not found in this consultation |
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |
| 403 | `FORBIDDEN` | Consultation belongs to another user |
| 404 | `NOT_FOUND` | Consultation ID does not exist |

---

## 10. GET /api/history

Lists the authenticated user's past consultations. Paginated, sorted by most recent first.

**Auth:** Authenticated (JWT)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Results per page (max 50) |
| `status` | string | all | Filter by status: `completed`, `failed`, `cancelled` |
| `intent` | string | all | Filter by consultation type (Axis 1) |
| `from` | date | none | Start date (ISO 8601) |
| `to` | date | none | End date (ISO 8601) |

**Response 200:**

```typescript
interface HistoryResponse {
  consultations: ConsultationSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ConsultationSummary {
  consultation_id: string;
  created_at: string;
  completed_at?: string;
  status: ConsultationStatus;
  question_preview: string;        // First 200 characters of the question
  classification: {
    intent: ConsultationType;
    domains: Domain[];
    complexity_score: number;
  };
  specialists: SpecialistType[];
  consensus_reached: boolean;
  total_rounds: number;
  total_cost_usd: number;
  recommendation_count: number;
  outcome_summary?: {
    reported: number;              // How many recommendations have outcome reports
    improved: number;
    unchanged: number;
    worsened: number;
    pending: number;
  };
  follow_up_count: number;
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |

---

## 11. GET /api/labs

Returns the authenticated user's lab history with computed trends. Data sourced from profile entries, consultation inputs, and outcome reports.

**Auth:** Authenticated (JWT)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `test_name` | string | all | Filter by specific lab test name |
| `from` | date | 6 months ago | Start date |
| `to` | date | today | End date |
| `group_by` | string | `test_name` | Grouping: `test_name` or `category` |

**Response 200:**

```typescript
interface LabHistoryResponse {
  labs: LabTestGroup[];
  date_range: {
    from: string;
    to: string;
  };
}

interface LabTestGroup {
  test_name: string;
  loinc_code?: string;
  unit: string;
  reference_range: {
    low: number;
    high: number;
  };
  readings: LabReading[];
  trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
  trend_details: {
    direction: number;          // Slope of linear regression
    r_squared: number;          // Fit quality
    clinically_meaningful: boolean;  // Based on CLINICALLY_MEANINGFUL_CHANGE thresholds
    delta_from_first_to_last: number;
    delta_pct: number;
  };
  latest_value: number;
  latest_date: string;
  latest_interpretation: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';
}

interface LabReading {
  value: number;
  date: string;
  source: 'manual_entry' | 'pdf_import' | 'api_import' | 'consultation_input';
  consultation_id?: string;    // Which consultation this reading came from
  interpretation: string;
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |

---

## 12. POST /api/labs

Adds new lab results to the user's lab history. These become available for future consultations as trend data.

**Auth:** Authenticated (JWT)

**Request Body:**

```typescript
interface AddLabsRequest {
  results: LabResultInput[];
  source: 'manual_entry' | 'pdf_import';
}

interface LabResultInput {
  name: string;                  // Lab test name (normalized against LOINC)
  value: number;
  unit: string;                  // UCUM standard
  date: string;                  // ISO 8601 date
  reference_range_low?: number;
  reference_range_high?: number;
  lab_name?: string;             // Name of the laboratory
  notes?: string;
}
```

**Server-side processing:**

1. Validate inputs against lab_result schema
2. Run biological plausibility checks (from validate_patient_data in DISCUSSION-PROTOCOL.md)
3. Attempt LOINC code mapping for each test name
4. Check for duplicate entries (UNIQUE constraint on user_id + test_name + lab_date)
5. Compute trend against existing history
6. Store in lab_history table

**Response 201:**

```typescript
interface AddLabsResponse {
  added: number;
  duplicates_skipped: number;
  validation_warnings: Array<{
    test_name: string;
    warning: string;           // e.g., "Value appears biologically implausible"
  }>;
  trends_updated: Array<{
    test_name: string;
    previous_trend: string;
    new_trend: string;
    readings_count: number;
  }>;
}
```

**Error Responses:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | One or more results fail schema validation |
| 400 | `IMPLAUSIBLE_VALUES` | Biologically implausible values detected. Returns details. |
| 401 | `UNAUTHORIZED` | Invalid or missing JWT |

---

## Common Response Envelope

All API responses (except SSE) use this envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;                    // Present on success
  error?: {
    code: string;              // Machine-readable error code (e.g., 'VALIDATION_ERROR')
    message: string;           // Human-readable message
    details?: unknown;         // Additional error context (validation errors, anomalies, etc.)
  };
  meta?: {
    request_id: string;        // UUID for tracing
    duration_ms: number;       // Server processing time
  };
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/signup | 5 | per hour per IP |
| POST /api/auth/login | 5 | per minute per IP |
| POST /api/consult | 3 | per hour per user |
| POST /api/consult | 10 | per day per user |
| POST /api/consult/:id/followup | 10 | per consultation (lifetime) |
| POST /api/labs | 20 | per hour per user |
| GET endpoints | 60 | per minute per user |

Rate limit headers included on all responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1711300800
```

---

## De-identification Rules

The privacy pipeline runs before any external API call. These rules are enforced at the route handler level:

1. **Before LLM calls (Claude, GPT, Perplexity):** Strip name, email, exact DOB (use age only), address, phone, insurance info, social identifiers
2. **Before DrugBank/RxNorm:** Only medication names and doses are sent (no patient identifiers)
3. **Before PubMed:** Only search queries are sent (no patient data at all)
4. **Response storage:** Full patient-linked data stored in Supabase with AES-256 encryption at rest, RLS enforced

The de-identification module is mandatory. No route handler may call an external API without passing through it first.
