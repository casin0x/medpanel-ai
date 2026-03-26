# MedPanel AI -- Multi-Agent Orchestrator Specification

Phase 3.4: The orchestration engine that drives every consultation. This is the implementation blueprint for `src/lib/agents/orchestrator.ts`.

---

## 1. State Machine

Every consultation follows a deterministic state machine. States correspond exactly to the `consultation_status` enum in `shared-definitions.json`.

### ASCII State Diagram

```
                              ┌─────────────────────────────────────────────────────────────┐
                              │                                                             │
                              │   EMERGENCY detected at any point                           │
                              │   → emit emergency response → completed                     │
                              │                                                             │
                              │   FATAL ERROR at any point                                  │
                              │   → emit error → failed                                     │
                              │                                                             │
                              │   USER CANCEL at any point                                  │
                              │   → emit cancellation → cancelled                           │
                              └─────────────────────────────────────────────────────────────┘

    ┌──────────────┐     ┌───────────────────────┐     ┌──────────────────────────┐
    │              │     │                       │     │                          │
    │  classifying ├────►│  retrieving_evidence  ├────►│  specialists_analyzing   │
    │              │     │                       │     │  (Round 1)               │
    └──────┬───────┘     └───────────┬───────────┘     └────────────┬─────────────┘
           │                         │                              │
           │ classification          │ evidence timeout             │
           │ fails → failed          │ (partial OK) → continue      │
           │                         │ (total fail) → continue      │ all agents fail
           │ emergency               │   with degraded flag         │ → failed
           │ detected → completed    │                              │
           │ (with emergency         │                              │ budget HARD_STOP
           │  response only)         │                              │ → synthesizing
                                                                    │
                                                                    ▼
                                                     ┌──────────────────────────┐
                                                     │                          │
                                                     │   discussion_round_2     │
                                                     │   (Cross-Examination)    │
                                                     │                          │
                                                     └────────────┬─────────────┘
                                                                  │
                                          ┌───────────────────────┼───────────────────────┐
                                          │                       │                       │
                                          ▼                       ▼                       ▼
                                   consensus            unresolved +              budget exceeded
                                   reached              budget OK                 or no info gain
                                          │                       │                       │
                                          │                       ▼                       │
                                          │        ┌──────────────────────────┐           │
                                          │        │                          │           │
                                          │        │   discussion_round_3     │           │
                                          │        │   (Focused Resolution)   │           │
                                          │        │                          │           │
                                          │        └────────────┬─────────────┘           │
                                          │                     │                         │
                                          └─────────┬───────────┘─────────────────────────┘
                                                    │
                                                    ▼
                                     ┌──────────────────────────┐
                                     │                          │
                                     │      synthesizing        │
                                     │                          │
                                     └────────────┬─────────────┘
                                                  │
                                                  ▼
                                     ┌──────────────────────────┐
                                     │                          │
                                     │    safety_checking       │
                                     │                          │
                                     └────────────┬─────────────┘
                                                  │
                                                  ▼
                                     ┌──────────────────────────┐
                                     │                          │
                                     │       completed          │
                                     │                          │
                                     └──────────────────────────┘


    Terminal states: completed | failed | cancelled
```

### State Transition Table

| From | To | Trigger | Side Effects |
|------|----|---------|--------------|
| `classifying` | `retrieving_evidence` | Classification succeeds | Specialist roster determined, budget tier set |
| `classifying` | `completed` | Emergency detected | Emergency response emitted, no agents invoked |
| `classifying` | `failed` | Classifier call fails after retry | Error stored |
| `retrieving_evidence` | `specialists_analyzing` | Evidence package assembled (full or partial) | Evidence package stored, degradation flags set |
| `specialists_analyzing` | `discussion_round_2` | Round 1 completes (at least 1 agent succeeded) | Cross-domain harm detected, budget checked |
| `specialists_analyzing` | `synthesizing` | Budget HARD_STOP after Round 1 | Emergency synthesis triggered |
| `specialists_analyzing` | `failed` | All agents fail | Error stored |
| `discussion_round_2` | `discussion_round_3` | Unresolved disagreements exist + budget permits + info gain sufficient | False consensus checked |
| `discussion_round_2` | `synthesizing` | Consensus reached OR budget exceeded OR diminishing returns | Termination reason recorded |
| `discussion_round_3` | `synthesizing` | Round 3 complete (always transitions) | Deferred concerns extracted |
| `synthesizing` | `safety_checking` | Synthesis generated | Patient + physician mode outputs rendered |
| `safety_checking` | `completed` | Safety check passes | Consultation stored, follow-ups scheduled, quality metrics computed |
| `safety_checking` | `completed` | Safety check adds wrappers | Wrappers applied to output, then stored |
| Any non-terminal | `failed` | Fatal error + no recovery | Error details stored |
| Any non-terminal | `cancelled` | User cancellation signal | Partial results stored if any |

---

## 2. Internal State Types

```typescript
// ═══════════════════════════════════════════════════════
// Core orchestrator state -- lives in memory during a
// consultation, persisted to Supabase on completion
// ═══════════════════════════════════════════════════════

import type {
  ConsultationStatus,
  SpecialistType,
  ConsultationType,
  Domain,
  Urgency,
  TerminationReason,
  Severity,
  ModelTier,
  EvidenceTier,
} from '@/types/shared-definitions';

/** Budget tier determined by complexity score */
interface BudgetTier {
  tier: 'simple' | 'moderate' | 'complex';
  complexity_range: string;
  max_cost_usd: number;
  max_total_tokens: number;
}

/** Per-model cost rates (USD per 1M tokens) */
interface ModelCostRate {
  input: number;
  output: number;
}

/** Record of a single LLM API call */
interface LLMCallRecord {
  call_id: string;
  phase: OrchestratorPhase;
  agent_id?: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  latency_ms: number;
  success: boolean;
  error?: string;
  retry_of?: string;       // call_id of the original call if this is a retry
  timestamp: string;
}

/** Orchestrator processing phases */
type OrchestratorPhase =
  | 'safety_precheck'
  | 'classification'
  | 'evidence_retrieval'
  | 'round_1'
  | 'round_2'
  | 'round_3'
  | 'devils_advocate'
  | 'synthesis'
  | 'safety_postcheck';

/** Budget tracking state */
interface BudgetState {
  tier: BudgetTier;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  calls: LLMCallRecord[];
  action: 'PROCEED' | 'WARN' | 'DEGRADE' | 'HARD_STOP';
  degradation_applied: DegradationStrategy[];
}

/** Degradation strategies applied when budget is pressured */
type DegradationStrategy =
  | { type: 'reduce_round_3_tokens'; new_limit: number }
  | { type: 'downgrade_models'; rounds: number[]; from: string; to: string }
  | { type: 'skip_round_3' }
  | { type: 'drop_agent'; agent_id: string; reason: string }
  | { type: 'emergency_synthesis' };

/** Classification result from Haiku */
interface ClassificationResult {
  intent: ConsultationType;
  domains: Domain[];
  urgency: Urgency;
  complexity_score: number;        // 0.0 - 10.0
  specialists: SpecialistAssignment[];
  safety_precheck: SaftyPrecheckResult;
}

/** A specialist assigned to this consultation */
interface SpecialistAssignment {
  specialist_type: SpecialistType;
  agent_id: string;                // e.g., 'cardiologist_001'
  model: string;                   // e.g., 'claude-opus-4-6'
  model_tier: ModelTier;           // 'opus' | 'sonnet' | 'haiku'
  is_lead: boolean;                // Top 2 by signal strength
  prompt_path: string;             // e.g., 'prompts/cardiologist.md'
}

/** Safety pre-check result */
interface SaftyPrecheckResult {
  passed: boolean;
  urgency: Urgency;
  severity_score: number;          // 0-100
  matched_patterns: string[];
  classification?: 'TRUE_EMERGENCY' | 'TRUE_URGENT' | 'HISTORICAL_CONTEXT'
    | 'HYPOTHETICAL' | 'THIRD_PARTY' | 'FALSE_POSITIVE';
  emergency_response?: string;     // Pre-built template if emergency
}

/** Evidence package (assembled by evidence pipeline) */
interface EvidencePackage {
  shared_context: SharedContext;
  specialist_contexts: Record<string, SpecialistContext>;
  citations: Citation[];
  interactions: Interaction[];
  retrieval_metadata: {
    overall_status: 'complete' | 'partial' | 'degraded' | 'unavailable';
    steps: Record<string, {
      status: 'success' | 'partial' | 'timeout' | 'error' | 'skipped';
      latency_ms: number;
      error?: string;
    }>;
    total_latency_ms: number;
  };
}

/** Cross-domain conflict detected between specialist recommendations */
interface CrossDomainConflict {
  rec_a: { agent_id: string; rec_id: string; substance: string };
  rec_b: { agent_id: string; rec_id: string; substance: string };
  interaction: {
    mechanism: string;
    severity: string;
    evidence: string;
    monitoring: string;
  };
  resolution_required: boolean;
}

/** False consensus detection result */
interface FalseConsensusResult {
  any_flags: boolean;
  flags: Array<{
    recommendation: string;
    flag_type: 'POSSIBLE_ECHO_CHAMBER' | 'CONFIDENCE_EXCEEDS_EVIDENCE' | 'SUSPICIOUS_UNANIMITY';
    note: string;
  }>;
  devils_advocate_output?: AgentOutput;
}

/** Unresolved disagreement from Round 2 */
interface UnresolvedDisagreement {
  disagreement_id: string;
  parties: string[];               // agent_ids
  topic: string;
  severity: Severity;
  requires_round_3: boolean;
}

/** SSE event emitted to the client */
interface OrchestrationEvent {
  id: number;                      // Monotonically increasing
  event: SSEEventType;
  data: {
    phase: ConsultationStatus;
    timestamp: string;
    payload: Record<string, unknown>;
  };
}

/** Complete orchestrator state */
interface OrchestratorState {
  // Identity
  consultation_id: string;
  user_id: string;
  profile_id: string;
  profile_version: number;

  // Status
  status: ConsultationStatus;
  started_at: string;
  completed_at?: string;

  // Input
  question: { text: string; context?: string };
  patient_profile: PatientProfile;          // Loaded from Supabase
  outcome_history?: OutcomeContext;          // From build_outcome_context()
  data_validation: DataValidationResult;    // From validate_patient_data()
  completeness: CompletenessResult;         // From score_completeness()

  // Classification
  classification?: ClassificationResult;

  // Evidence
  evidence_package?: EvidencePackage;

  // Discussion rounds
  round_1_outputs: Map<string, AgentOutput>;    // agent_id -> output
  round_1_failed: Map<string, string>;          // agent_id -> error message
  cross_domain_conflicts: CrossDomainConflict[];

  round_2_outputs: Map<string, AgentOutput>;
  round_2_failed: Map<string, string>;
  false_consensus?: FalseConsensusResult;
  unresolved_disagreements: UnresolvedDisagreement[];

  round_3_outputs: Map<string, AgentOutput>;    // key: `${agent_id}_${disagreement_id}`
  deferred_concerns: DeferredConcern[];

  // Synthesis
  synthesis?: SynthesisOutput;
  safety_postcheck?: SafetyPostcheckResult;

  // Budget
  budget: BudgetState;

  // Quality metrics (computed post-synthesis)
  quality_metrics?: QualityMetrics;

  // SSE event log (for reconnection replay)
  events: OrchestrationEvent[];
  event_counter: number;

  // Termination
  termination_reason?: TerminationReason;
}
```

---

## 3. Agent Execution Model

All specialist agents within a round run in parallel using `Promise.allSettled`. Each agent has an individual timeout. Failed agents are logged and the consultation proceeds with available outputs.

### Parallel Execution with Individual Timeouts

```typescript
// ═══════════════════════════════════════════════════════
// Pseudocode: parallel agent execution with per-agent
// timeout, retry with fallback model, and budget tracking
// ═══════════════════════════════════════════════════════

const AGENT_TIMEOUT_MS = 60_000;      // 60 seconds per agent
const ROUND_TIMEOUT_MS = 180_000;     // 180 seconds per round
const CONSULTATION_TIMEOUT_MS = 600_000; // 10 minutes total
const MAX_RETRIES = 1;                 // Retry once on failure

async function executeRound(
  state: OrchestratorState,
  roundNumber: 1 | 2 | 3,
  agents: SpecialistAssignment[],
  buildPrompt: (agent: SpecialistAssignment) => PromptPayload,
  outputSchema: JSONSchema,
  config: RoundConfig
): Promise<Map<string, AgentOutput>> {

  const results = new Map<string, AgentOutput>();
  const failures = new Map<string, string>();

  // Create per-agent promises with individual timeouts
  const agentPromises = agents.map(agent =>
    executeAgentWithRetry(agent, buildPrompt(agent), outputSchema, config)
  );

  // Race all agents against the round timeout
  const roundTimer = createTimeout(ROUND_TIMEOUT_MS, 'ROUND_TIMEOUT');

  const settled = await Promise.race([
    Promise.allSettled(agentPromises),
    roundTimer.then(() => {
      // Round timed out — collect whatever finished
      return agentPromises.map(p => {
        // Check if each promise settled
        // If not, treat as rejected with timeout
        return { status: 'rejected' as const, reason: 'ROUND_TIMEOUT' };
      });
    })
  ]);

  // Process results
  for (let i = 0; i < settled.length; i++) {
    const agent = agents[i];
    const result = settled[i];

    if (result.status === 'fulfilled' && result.value !== null) {
      results.set(agent.agent_id, result.value);

      // Record cost
      state.budget = recordCost(state.budget, result.value.token_usage, agent.model);

      // Emit SSE
      emitEvent(state, 'agent_complete', {
        specialist: agent.specialist_type,
        findings_count: result.value.findings?.length ?? 0,
        time_ms: result.value._latency_ms,
      });
    } else {
      const errorMsg = result.status === 'rejected'
        ? String(result.reason)
        : 'Unknown failure';
      failures.set(agent.agent_id, errorMsg);

      emitEvent(state, 'agent_failed', {
        specialist: agent.specialist_type,
        error: errorMsg,
        recoverable: true,
      });
    }
  }

  // Store results and failures on state
  if (roundNumber === 1) {
    state.round_1_outputs = results;
    state.round_1_failed = failures;
  } else if (roundNumber === 2) {
    state.round_2_outputs = results;
    state.round_2_failed = failures;
  } else {
    state.round_3_outputs = results;
  }

  return results;
}


async function executeAgentWithRetry(
  agent: SpecialistAssignment,
  prompt: PromptPayload,
  schema: JSONSchema,
  config: RoundConfig
): Promise<AgentOutput | null> {

  // Attempt 1: primary model
  try {
    const output = await callAgentWithTimeout(
      agent.model, prompt, schema, config, AGENT_TIMEOUT_MS
    );
    const validated = validateOutput(output, schema);
    if (validated.success) return validated.data;
    // Validation failed — fall through to retry
  } catch (err) {
    // Timeout or API error — fall through to retry
  }

  // Attempt 2: fallback to Sonnet (cheaper, faster)
  const fallbackModel = 'claude-sonnet-4-6';
  try {
    const output = await callAgentWithTimeout(
      fallbackModel, prompt, schema, config, AGENT_TIMEOUT_MS
    );
    const validated = validateOutput(output, schema);
    if (validated.success) {
      validated.data.model = fallbackModel; // Record actual model used
      return validated.data;
    }
  } catch (err) {
    // Both attempts failed
  }

  return null; // Agent failed completely — orchestrator continues without it
}


async function callAgentWithTimeout(
  model: string,
  prompt: PromptPayload,
  schema: JSONSchema,
  config: RoundConfig,
  timeoutMs: number
): Promise<unknown> {

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const startMs = Date.now();
    const response = await anthropic.messages.create({
      model,
      max_tokens: config.maxOutputTokens,
      temperature: config.temperature,
      // seed: config.seed,   // When API supports deterministic seeding
      system: prompt.system,
      messages: prompt.messages,
      // tool_use for structured output enforcement
      tools: [{ name: 'submit_output', input_schema: schema }],
      tool_choice: { type: 'tool', name: 'submit_output' },
    }, { signal: controller.signal });

    const latencyMs = Date.now() - startMs;

    // Extract structured output from tool_use response
    const toolUse = response.content.find(c => c.type === 'tool_use');
    if (!toolUse) throw new Error('No structured output in response');

    return {
      ...toolUse.input,
      token_usage: { input: response.usage.input_tokens, output: response.usage.output_tokens },
      _latency_ms: latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}
```

---

## 4. Prompt Loading

Specialist prompts live in `prompts/*.md` files. They are loaded from disk at runtime (not hardcoded). This means editing a prompt file does not require a code deploy.

### Prompt Template Parameterization

Every specialist prompt file uses two placeholder blocks:

```
{patient_context}     → Replaced with de-identified patient profile + shared evidence
{evidence_package}    → Replaced with the evidence package (citations, interactions, guidelines)
```

Additional dynamic injections per round:

| Round | Injection |
|-------|-----------|
| Round 1 | `{patient_context}`, `{evidence_package}`, `{outcome_history}`, `{data_quality_warnings}` |
| Round 2 | All of Round 1 + `{own_round_1_output}`, `{other_agents_round_1_outputs}`, `{cross_domain_conflicts}` |
| Round 3 | `{disagreement_to_resolve}`, `{both_parties_positions}` |

### Prompt Loader Implementation

```typescript
// ═══════════════════════════════════════════════════════
// Prompt loading + parameterization
// ═══════════════════════════════════════════════════════

import { readFile } from 'fs/promises';
import { join } from 'path';

const PROMPTS_DIR = join(process.cwd(), 'prompts');

// Cache loaded prompts (invalidated on file change in dev mode)
const promptCache = new Map<string, { content: string; mtime: number }>();

async function loadPrompt(specialistType: SpecialistType): Promise<string> {
  const filename = specialistToFilename(specialistType);
  const filepath = join(PROMPTS_DIR, filename);

  // Check cache validity
  const stat = await fsStat(filepath);
  const cached = promptCache.get(filepath);
  if (cached && cached.mtime === stat.mtimeMs) {
    return cached.content;
  }

  const content = await readFile(filepath, 'utf-8');
  promptCache.set(filepath, { content, mtime: stat.mtimeMs });
  return content;
}

function specialistToFilename(type: SpecialistType): string {
  const map: Record<SpecialistType, string> = {
    internist: 'internist.md',             // Anchor agent
    cardiologist: 'cardiologist.md',
    endocrinologist: 'endocrinologist.md',
    nephrologist: 'nephrologist.md',
    neuropsychiatrist: 'neuropsychiatrist.md',
    neurologist: 'neuropsychiatrist.md',    // Shared prompt, differentiated in system instruction
    functional_medicine: 'functional-medicine.md',
    clinical_pharmacologist: 'pharmacologist.md',
    gastroenterologist: 'gastroenterologist.md',
    hepatologist: 'hepatologist.md',
    pulmonologist: 'pulmonologist.md',
    rheumatologist: 'rheumatologist.md',
    sports_medicine: 'sports-medicine.md',
    dermatologist: 'dermatologist.md',
    hematologist: 'hematologist.md',
    immunologist: 'immunologist.md',
    reproductive_endocrinologist: 'reproductive-endocrinologist.md',
    ophthalmologist: 'ophthalmologist.md',
    otolaryngologist: 'otolaryngologist.md',
    nutritional_medicine: 'nutritional-medicine.md',
    sleep_medicine: 'sleep-medicine.md',
    pain_management: 'pain-management.md',
    geriatrician: 'geriatrician.md',
    obstetrician: 'obstetrician.md',
  };
  return map[type] ?? `${type.replace(/_/g, '-')}.md`;
}


function buildRound1Prompt(
  agent: SpecialistAssignment,
  basePrompt: string,
  state: OrchestratorState
): PromptPayload {

  const patientContext = serializePatientContext(
    state.patient_profile,
    state.evidence_package!.shared_context,
    state.evidence_package!.specialist_contexts[agent.specialist_type]
  );

  const evidencePackage = serializeEvidencePackage(
    state.evidence_package!
  );

  const outcomeHistory = state.outcome_history
    ? serializeOutcomeHistory(state.outcome_history)
    : '';

  const dataWarnings = state.data_validation.anomalies.length > 0
    ? `\nDATA QUALITY WARNINGS:\n${state.data_validation.anomalies.map(a => `- ${a.description}`).join('\n')}`
    : '';

  const incompleteWarning = state.completeness.score < 0.70
    ? `\nINCOMPLETE DATA WARNING: The following fields are missing: ${state.completeness.gaps.map(g => g.field).join(', ')}. You MUST explicitly state when your analysis would change if this missing data revealed specific values. Do not assume normal.`
    : '';

  // Parameterize the loaded prompt
  const systemPrompt = basePrompt
    .replace('{patient_context}', patientContext)
    .replace('{evidence_package}', evidencePackage)
    .replace('{outcome_history}', outcomeHistory)
    .replace('{data_quality_warnings}', dataWarnings + incompleteWarning);

  return {
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Consultation question: ${state.question.text}${state.question.context ? `\n\nAdditional context: ${state.question.context}` : ''}`,
      },
    ],
  };
}


function buildRound2Prompt(
  agent: SpecialistAssignment,
  state: OrchestratorState
): PromptPayload {

  const ownOutput = state.round_1_outputs.get(agent.agent_id);
  const otherOutputs = Array.from(state.round_1_outputs.entries())
    .filter(([id]) => id !== agent.agent_id)
    .map(([id, output]) => ({ agent_id: id, output }));

  const conflictsForAgent = state.cross_domain_conflicts.filter(
    c => c.rec_a.agent_id === agent.agent_id || c.rec_b.agent_id === agent.agent_id
  );

  return {
    system: CROSS_EXAMINATION_PROMPT,   // From DISCUSSION-PROTOCOL.md
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          your_round_1_output: ownOutput,
          other_specialists_round_1: otherOutputs,
          detected_cross_domain_conflicts: conflictsForAgent,
        }),
      },
    ],
  };
}


function buildRound3Prompt(
  agent: SpecialistAssignment,
  disagreement: UnresolvedDisagreement,
  state: OrchestratorState
): PromptPayload {

  return {
    system: ROUND_3_PROMPT.replace('{disagreement_list}', JSON.stringify(disagreement)),
    messages: [
      {
        role: 'user',
        content: `Resolve disagreement ${disagreement.disagreement_id}: ${disagreement.topic}`,
      },
    ],
  };
}
```

---

## 5. Round Management

### Round 1: Parallel Independent Analysis

```typescript
async function executeRound1(state: OrchestratorState): Promise<void> {
  state.status = 'specialists_analyzing';
  emitEvent(state, 'phase_transition', { phase: 'specialists_analyzing' });

  const agents = state.classification!.specialists;

  // Load all prompts in parallel
  const prompts = await Promise.all(
    agents.map(async agent => ({
      agent,
      prompt: await loadPrompt(agent.specialist_type),
    }))
  );

  // Build parameterized prompts
  const agentPrompts = prompts.map(({ agent, prompt }) => ({
    agent,
    payload: buildRound1Prompt(agent, prompt, state),
  }));

  // Execute all agents in parallel
  const config: RoundConfig = {
    maxOutputTokens: getBudgetAdjustedTokenLimit(state, 'round_1', 3000),
    temperature: 0.3,
    seed: computeSeed(state, 'round_1'),
  };

  await executeRound(
    state,
    1,
    agents,
    (agent) => agentPrompts.find(p => p.agent.agent_id === agent.agent_id)!.payload,
    ROUND_1_OUTPUT_SCHEMA,
    config
  );

  // Post-Round-1: detect cross-domain harm
  if (state.round_1_outputs.size >= 2) {
    state.cross_domain_conflicts = detectCrossDomainHarm(
      Array.from(state.round_1_outputs.values())
    );
  }

  emitEvent(state, 'round_1_complete', {
    agents_completed: state.round_1_outputs.size,
    agents_failed: state.round_1_failed.size,
    findings_count: countFindings(state.round_1_outputs),
    conflicts_detected: state.cross_domain_conflicts.length,
  });
}
```

### Round 2: Sequential Context Assembly, Parallel Execution

Each agent receives ALL Round 1 outputs (not just their own), so context assembly is serial -- but agent calls still execute in parallel.

```typescript
async function executeRound2(state: OrchestratorState): Promise<void> {
  state.status = 'discussion_round_2';
  emitEvent(state, 'phase_transition', { phase: 'discussion_round_2' });

  // Only agents that succeeded in Round 1 participate in Round 2
  const activeAgents = state.classification!.specialists.filter(
    a => state.round_1_outputs.has(a.agent_id)
  );

  const config: RoundConfig = {
    maxOutputTokens: getBudgetAdjustedTokenLimit(state, 'round_2', 2000),
    temperature: 0.4,
    seed: computeSeed(state, 'round_2'),
  };

  // Apply model degradation if budget is pressured
  const adjustedAgents = applyModelDegradation(activeAgents, state, 2);

  await executeRound(
    state,
    2,
    adjustedAgents,
    (agent) => buildRound2Prompt(agent, state),
    ROUND_2_OUTPUT_SCHEMA,
    config
  );

  // Collect unresolved disagreements
  state.unresolved_disagreements = collectUnresolvedDisagreements(state.round_2_outputs);

  // Check for false consensus (only if no disagreements)
  if (state.unresolved_disagreements.length === 0) {
    state.false_consensus = detectFalseConsensus(
      Array.from(state.round_2_outputs.values())
    );

    if (state.false_consensus.any_flags) {
      // Run devil's advocate pass (Sonnet, cost-efficient)
      const devilsOutput = await executeDevilsAdvocate(state);
      if (devilsOutput) {
        state.false_consensus.devils_advocate_output = devilsOutput;
      }
    }
  }

  emitEvent(state, 'round_2_complete', {
    agents_completed: state.round_2_outputs.size,
    agreements_count: countAgreements(state.round_2_outputs),
    disagreements_count: countDisagreements(state.round_2_outputs),
    unresolved_count: state.unresolved_disagreements.length,
    false_consensus_flags: state.false_consensus?.flags.length ?? 0,
  });
}
```

### Round 3: Conditional Focused Resolution

```typescript
async function executeRound3(state: OrchestratorState): Promise<boolean> {
  // Gate: check all three trigger conditions
  const shouldRun = shouldRunRound3(state);
  if (!shouldRun.run) {
    emitEvent(state, 'round_3_skipped', { reason: shouldRun.reason });
    return false;
  }

  state.status = 'discussion_round_3';
  emitEvent(state, 'phase_transition', { phase: 'discussion_round_3' });

  const config: RoundConfig = {
    maxOutputTokens: getBudgetAdjustedTokenLimit(state, 'round_3', 500),
    temperature: 0.2,
    seed: computeSeed(state, 'round_3'),
  };

  // Only agents involved in unresolved disagreements participate
  for (const disagreement of state.unresolved_disagreements) {
    const involvedAgents = state.classification!.specialists.filter(
      a => disagreement.parties.includes(a.agent_id)
    );

    const agentPromises = involvedAgents.map(async agent => {
      const output = await executeAgentWithRetry(
        agent,
        buildRound3Prompt(agent, disagreement, state),
        ROUND_3_OUTPUT_SCHEMA,
        config
      );

      if (output) {
        // Check for new concerns (prohibited in Round 3)
        if (output.deferred_new_concern) {
          state.deferred_concerns.push({
            topic: output.deferred_new_concern.topic,
            raised_by: agent.agent_id,
            urgency: output.deferred_new_concern.urgency,
          });
          // Strip from resolution output -- unless it's a safety red flag
          if (output.deferred_new_concern.urgency !== 'emergent') {
            output.deferred_new_concern = null;
          }
        }

        state.round_3_outputs.set(
          `${agent.agent_id}_${disagreement.disagreement_id}`,
          output
        );
        recordCost(state.budget, output.token_usage, agent.model);
      }
    });

    await Promise.allSettled(agentPromises);
  }

  emitEvent(state, 'round_3_complete', {
    resolutions: state.round_3_outputs.size,
    deferred_concerns: state.deferred_concerns.length,
  });

  return true;
}

function shouldRunRound3(state: OrchestratorState): { run: boolean; reason: string } {
  // Condition 1: unresolved disagreements with requires_round_3 === true
  const needsResolution = state.unresolved_disagreements.filter(d => d.requires_round_3);
  if (needsResolution.length === 0) {
    return { run: false, reason: 'no_unresolved_disagreements' };
  }

  // Condition 2: disagreement involves severity >= moderate
  const severityOrder: Severity[] = ['informational', 'low', 'moderate', 'high', 'critical'];
  const hasModeratePlus = needsResolution.some(
    d => severityOrder.indexOf(d.severity) >= severityOrder.indexOf('moderate')
  );
  if (!hasModeratePlus) {
    return { run: false, reason: 'disagreements_below_severity_threshold' };
  }

  // Condition 3: budget has not exceeded 80%
  const budgetPct = state.budget.total_cost_usd / state.budget.tier.max_cost_usd;
  if (budgetPct >= 0.80) {
    return { run: false, reason: 'budget_exceeded_80_percent' };
  }

  return { run: true, reason: 'conditions_met' };
}
```

---

## 6. Consensus Detection

Translates the consensus detection algorithm from DISCUSSION-PROTOCOL.md into TypeScript. Runs after Round 2 completes.

```typescript
// ═══════════════════════════════════════════════════════
// Consensus detection: determines if specialists agree
// enough to skip Round 3 and proceed to synthesis
// ═══════════════════════════════════════════════════════

interface ConsensusResult {
  reached: boolean;
  level: 'strong_consensus' | 'moderate_consensus' | 'single_specialist_domain' | 'disagreement';
  areas_of_agreement: AgreementArea[];
  areas_of_disagreement: DisagreementArea[];
  termination_recommendation: {
    terminate: boolean;
    reason: TerminationReason;
  };
}

interface AgreementArea {
  topic: string;
  agreeing_agents: string[];           // agent_ids
  agreement_level: 'unanimous' | 'strong_majority' | 'majority';
  average_confidence: number;
  evidence_tier: EvidenceTier;
  false_consensus_flag?: string;       // POSSIBLE_ECHO_CHAMBER etc.
}

interface DisagreementArea {
  disagreement_id: string;
  topic: string;
  parties: Array<{
    agent_id: string;
    position: string;
    confidence: number;
    evidence_strength: EvidenceTier;
  }>;
  severity: Severity;
  requires_round_3: boolean;
}

function detectConsensus(state: OrchestratorState): ConsensusResult {
  const round2Outputs = Array.from(state.round_2_outputs.values());
  const totalAgents = round2Outputs.length;

  // Step 1: Extract all agreements from Round 2 outputs
  const allAgreements: Map<string, string[]> = new Map(); // finding_id -> agreeing agent_ids
  for (const output of round2Outputs) {
    if (!output.agreements) continue;
    for (const agreement of output.agreements) {
      const key = agreement.finding_id;
      const existing = allAgreements.get(key) ?? [];
      existing.push(output.agent_id);
      allAgreements.set(key, existing);
    }
  }

  // Step 2: Classify agreement levels
  const areas_of_agreement: AgreementArea[] = [];
  for (const [findingId, agents] of allAgreements) {
    const ratio = agents.length / totalAgents;
    let level: AgreementArea['agreement_level'];

    if (ratio >= 1.0) level = 'unanimous';
    else if (ratio >= 0.75) level = 'strong_majority';
    else if (ratio > 0.5) level = 'majority';
    else continue; // Not enough agreement to classify

    // Compute average confidence across agreeing agents
    const confidences = agents.map(agentId => {
      const r1Output = state.round_1_outputs.get(agentId);
      return r1Output?.confidence_summary?.overall_confidence ?? 0.5;
    });
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

    areas_of_agreement.push({
      topic: findingId,
      agreeing_agents: agents,
      agreement_level: level,
      average_confidence: avgConfidence,
      evidence_tier: getStrongestEvidenceTier(agents, findingId, state),
    });
  }

  // Step 3: Extract all disagreements from Round 2 outputs
  const areas_of_disagreement: DisagreementArea[] = [];
  for (const output of round2Outputs) {
    if (!output.unresolved_disagreements) continue;
    for (const disagreement of output.unresolved_disagreements) {
      // Avoid duplicate entries for the same disagreement from both parties
      if (areas_of_disagreement.some(d => d.disagreement_id === disagreement.disagreement_id)) {
        continue;
      }

      areas_of_disagreement.push({
        disagreement_id: disagreement.disagreement_id,
        topic: disagreement.topic,
        parties: disagreement.parties.map(agentId => {
          const r2Out = state.round_2_outputs.get(agentId);
          return {
            agent_id: agentId,
            position: disagreement.my_final_position,
            confidence: r2Out?.confidence_summary?.overall_confidence ?? 0.5,
            evidence_strength: disagreement.evidence_strength_of_my_position ?? 'moderate',
          };
        }),
        severity: classifyDisagreementSeverity(disagreement),
        requires_round_3: disagreement.requires_round_3,
      });
    }
  }

  // Step 4: Determine overall consensus level
  const hasUnresolved = areas_of_disagreement.some(d => d.requires_round_3);
  let level: ConsensusResult['level'];

  if (areas_of_disagreement.length === 0) {
    level = areas_of_agreement.some(a => a.agreement_level === 'unanimous')
      ? 'strong_consensus'
      : 'moderate_consensus';
  } else if (!hasUnresolved) {
    level = 'moderate_consensus';
  } else {
    level = 'disagreement';
  }

  // Step 5: Termination decision
  const termination = shouldTerminate(state, areas_of_disagreement, level);

  return {
    reached: !hasUnresolved,
    level,
    areas_of_agreement,
    areas_of_disagreement,
    termination_recommendation: termination,
  };
}


function shouldTerminate(
  state: OrchestratorState,
  disagreements: DisagreementArea[],
  consensusLevel: ConsensusResult['level']
): { terminate: boolean; reason: TerminationReason } {

  // Condition 1: Full consensus after Round 2
  if (disagreements.length === 0) {
    return { terminate: true, reason: 'consensus_after_round_2' };
  }

  // Condition 2: Round 3 already completed
  if (state.status === 'discussion_round_3') {
    return { terminate: true, reason: 'max_rounds_reached' };
  }

  // Condition 3: Budget ceiling
  const budgetPct = state.budget.total_cost_usd / state.budget.tier.max_cost_usd;
  if (budgetPct >= 0.95) {
    return { terminate: true, reason: 'budget_exceeded' };
  }

  // Condition 4: Information gain below threshold
  if (state.round_1_outputs.size > 0 && state.round_2_outputs.size > 0) {
    const infoGain = computeInformationGain(
      Array.from(state.round_2_outputs.values()),
      Array.from(state.round_1_outputs.values())
    );
    if (infoGain < 0.05) {
      return { terminate: true, reason: 'no_new_information' };
    }
  }

  return { terminate: false, reason: 'consensus_reached' }; // Will proceed to Round 3
}
```

---

## 7. Budget Tracking

The budget tracker runs as a pure function after every LLM call. It determines whether the orchestrator should proceed, degrade, or stop.

```typescript
// ═══════════════════════════════════════════════════════
// Budget tracking and enforcement
// ═══════════════════════════════════════════════════════

const MODEL_COSTS: Record<string, ModelCostRate> = {
  'claude-opus-4-6':    { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':  { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':   { input: 0.80,  output: 4.00  },
  'gpt-4.1':            { input: 2.00,  output: 8.00  },
  'sonar-pro':          { input: 3.00,  output: 15.00 },
};

const BUDGET_TIERS: Record<string, BudgetTier> = {
  simple:   { tier: 'simple',   complexity_range: '0.0-2.5', max_cost_usd: 5.00,  max_total_tokens: 60_000 },
  moderate: { tier: 'moderate', complexity_range: '2.6-6.5', max_cost_usd: 15.00, max_total_tokens: 200_000 },
  complex:  { tier: 'complex',  complexity_range: '6.6-10.0', max_cost_usd: 25.00, max_total_tokens: 400_000 },
};

function selectBudgetTier(complexityScore: number): BudgetTier {
  if (complexityScore <= 2.5) return BUDGET_TIERS.simple;
  if (complexityScore <= 6.5) return BUDGET_TIERS.moderate;
  return BUDGET_TIERS.complex;
}

function calculateCallCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = MODEL_COSTS[model];
  if (!rates) throw new Error(`Unknown model: ${model}`);
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

function recordCost(
  budget: BudgetState,
  tokenUsage: { input: number; output: number },
  model: string
): BudgetState {
  const cost = calculateCallCost(model, tokenUsage.input, tokenUsage.output);

  const updated: BudgetState = {
    ...budget,
    total_input_tokens: budget.total_input_tokens + tokenUsage.input,
    total_output_tokens: budget.total_output_tokens + tokenUsage.output,
    total_cost_usd: budget.total_cost_usd + cost,
  };

  // Determine action based on spend percentage
  const pctSpent = updated.total_cost_usd / updated.tier.max_cost_usd;

  if (pctSpent >= 0.95)      updated.action = 'HARD_STOP';
  else if (pctSpent >= 0.80) updated.action = 'DEGRADE';
  else if (pctSpent >= 0.60) updated.action = 'WARN';
  else                       updated.action = 'PROCEED';

  return updated;
}


function applyDegradation(state: OrchestratorState): DegradationStrategy {
  const remaining = state.budget.tier.max_cost_usd - state.budget.total_cost_usd;

  // Strategy 1: Reduce Round 3 token limits (least impact)
  const round3EstimateCost = estimateRoundCost(state, 3, 500);
  if (remaining > round3EstimateCost * 0.6) {
    const strategy: DegradationStrategy = { type: 'reduce_round_3_tokens', new_limit: 250 };
    state.budget.degradation_applied.push(strategy);
    return strategy;
  }

  // Strategy 2: Downgrade Round 2+ models to Sonnet
  const sonnetSavings = 0.60; // ~60% cheaper
  if (remaining > round3EstimateCost * (1 - sonnetSavings)) {
    const strategy: DegradationStrategy = {
      type: 'downgrade_models', rounds: [2, 3], from: 'claude-opus-4-6', to: 'claude-sonnet-4-6'
    };
    state.budget.degradation_applied.push(strategy);
    return strategy;
  }

  // Strategy 3: Skip Round 3 entirely
  const round2Cost = estimateRoundCost(state, 2, 2000);
  if (remaining > round2Cost) {
    const strategy: DegradationStrategy = { type: 'skip_round_3' };
    state.budget.degradation_applied.push(strategy);
    return strategy;
  }

  // Strategy 4: Drop lowest-signal agent
  const lowestAgent = findLowestSignalAgent(state);
  if (lowestAgent) {
    const strategy: DegradationStrategy = {
      type: 'drop_agent', agent_id: lowestAgent.agent_id, reason: 'budget_degradation'
    };
    state.budget.degradation_applied.push(strategy);
    return strategy;
  }

  // Strategy 5: Emergency synthesis (last resort)
  const strategy: DegradationStrategy = { type: 'emergency_synthesis' };
  state.budget.degradation_applied.push(strategy);
  return strategy;
}


function getBudgetAdjustedTokenLimit(
  state: OrchestratorState,
  round: 'round_1' | 'round_2' | 'round_3',
  defaultLimit: number
): number {
  const degradations = state.budget.degradation_applied;

  if (round === 'round_3') {
    const round3Reduction = degradations.find(d => d.type === 'reduce_round_3_tokens');
    if (round3Reduction && round3Reduction.type === 'reduce_round_3_tokens') {
      return round3Reduction.new_limit;
    }
  }

  return defaultLimit;
}
```

---

## 8. Model Selection

Model assignment depends on the specialist's role and the complexity tier. The internist anchor always gets the top-tier model. Lead specialists (top 2 by clinical signal strength) get Opus. Supporting specialists can use Sonnet to control costs.

```typescript
// ═══════════════════════════════════════════════════════
// Model selection per specialist per complexity tier
// ═══════════════════════════════════════════════════════

interface ModelAssignment {
  model: string;
  tier: ModelTier;
}

const MODEL_MAP: Record<ModelTier, string> = {
  opus:   'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-6',
  haiku:  'claude-haiku-4-5',
};

function assignModels(
  specialists: SpecialistType[],
  complexityScore: number,
  signalStrengths: Map<SpecialistType, number>  // From classification: how relevant each specialty is
): SpecialistAssignment[] {

  const tier = selectBudgetTier(complexityScore).tier;

  // Sort by signal strength descending
  const sorted = [...specialists].sort(
    (a, b) => (signalStrengths.get(b) ?? 0) - (signalStrengths.get(a) ?? 0)
  );

  return sorted.map((specialist, index) => {
    const isInternist = specialist === 'internist';
    const isLead = index < 2;  // Top 2 by signal strength

    let modelTier: ModelTier;
    let model: string;

    if (tier === 'complex') {
      // Complex: all specialists get Opus
      modelTier = 'opus';
    } else if (tier === 'moderate') {
      // Moderate: leads + internist get Opus, rest get Sonnet
      modelTier = (isLead || isInternist) ? 'opus' : 'sonnet';
    } else {
      // Simple: internist gets Opus (if 1 specialist) or Sonnet, rest get Sonnet
      modelTier = (isInternist && sorted.length <= 2) ? 'opus' : 'sonnet';
    }

    model = MODEL_MAP[modelTier];

    return {
      specialist_type: specialist,
      agent_id: `${specialist}_001`,
      model,
      model_tier: modelTier,
      is_lead: isLead || isInternist,
      prompt_path: `prompts/${specialistToFilename(specialist)}`,
    };
  });
}

/** Downgrade model selection when budget degradation triggers */
function applyModelDegradation(
  agents: SpecialistAssignment[],
  state: OrchestratorState,
  round: number
): SpecialistAssignment[] {
  const modelDowngrade = state.budget.degradation_applied.find(
    d => d.type === 'downgrade_models' && d.rounds.includes(round)
  );

  if (!modelDowngrade || modelDowngrade.type !== 'downgrade_models') return agents;

  return agents.map(agent => ({
    ...agent,
    model: agent.model === modelDowngrade.from ? modelDowngrade.to : agent.model,
    model_tier: agent.model === modelDowngrade.from ? 'sonnet' as ModelTier : agent.model_tier,
  }));
}
```

---

## 9. Timeout Handling

Timeouts are enforced at four levels. Each level has a specific recovery behavior.

```typescript
// ═══════════════════════════════════════════════════════
// Timeout configuration and handling
// ═══════════════════════════════════════════════════════

const TIMEOUTS = {
  agent: 60_000,          // 60s per individual agent call
  evidence_pipeline: 15_000,  // 15s for evidence retrieval
  round: 180_000,         // 3 minutes per round (all agents)
  consultation: 600_000,  // 10 minutes total
  sse_heartbeat: 15_000,  // 15s between heartbeats
} as const;

/**
 * Consultation-level timeout controller.
 * Creates a master AbortController that aborts everything
 * when the total consultation time exceeds 10 minutes.
 */
class ConsultationTimer {
  private controller: AbortController;
  private timeoutId: NodeJS.Timeout;
  private startTime: number;

  constructor() {
    this.controller = new AbortController();
    this.startTime = Date.now();
    this.timeoutId = setTimeout(() => {
      this.controller.abort(new Error('CONSULTATION_TIMEOUT'));
    }, TIMEOUTS.consultation);
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  get elapsedMs(): number {
    return Date.now() - this.startTime;
  }

  get remainingMs(): number {
    return Math.max(0, TIMEOUTS.consultation - this.elapsedMs);
  }

  cancel(): void {
    clearTimeout(this.timeoutId);
  }

  /** Check if enough time remains for a given phase */
  hasTimeFor(estimatedMs: number): boolean {
    return this.remainingMs > estimatedMs + 5_000; // 5s buffer for synthesis
  }
}

/**
 * Per-agent timeout: wraps a promise with a timeout.
 * On timeout, the promise is rejected but the underlying LLM call
 * may still be in flight (we cannot cancel it). We just ignore it.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`));
    }, ms);

    promise
      .then(value => { clearTimeout(timer); resolve(value); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}
```

### Timeout Recovery Matrix

| Level | Timeout | Recovery | Fallback |
|-------|---------|----------|----------|
| Agent (60s) | Single LLM call exceeds 60s | Retry once with `claude-sonnet-4-6` (faster, cheaper) | If retry also fails: mark agent as failed, proceed without |
| Evidence (15s) | Evidence pipeline exceeds 15s | Package whatever data is available. Missing pieces get `status: 'timeout'` in retrieval metadata. Agents are told which evidence sources are missing. | If Perplexity fails entirely: agents run on patient data + DrugBank only. Cited evidence will be lower quality. |
| Round (180s) | All agents in a round collectively exceed 3 min | Cancel pending agents. Collect completed outputs. Proceed with partial results. | If zero agents complete in round: skip to synthesis with previous round's data. |
| Consultation (600s) | Total elapsed time exceeds 10 min | Emergency synthesis: take all available data from all completed phases, synthesize immediately. Set `termination_reason: 'emergency_synthesis'`. Quality flag added to output. | Always produces output, even if incomplete. |

---

## 10. Error Recovery

Every error path is handled. The system prefers degraded output over no output.

```typescript
// ═══════════════════════════════════════════════════════
// Error recovery: retry, fallback, graceful degradation
// ═══════════════════════════════════════════════════════

type RecoverableError =
  | { type: 'agent_timeout'; agent_id: string }
  | { type: 'agent_api_error'; agent_id: string; status: number }
  | { type: 'agent_validation_error'; agent_id: string; errors: string[] }
  | { type: 'evidence_timeout'; step: string }
  | { type: 'evidence_api_error'; step: string; status: number }
  | { type: 'classification_error'; error: string };

type FatalError =
  | { type: 'all_agents_failed'; round: number }
  | { type: 'classification_failed_after_retry' }
  | { type: 'consultation_timeout' }
  | { type: 'database_error'; error: string };

async function handleError(
  state: OrchestratorState,
  error: RecoverableError | FatalError
): Promise<'continue' | 'synthesize_early' | 'fail'> {

  switch (error.type) {
    // ---- Recoverable: agent failures ----
    case 'agent_timeout':
    case 'agent_api_error':
    case 'agent_validation_error': {
      // Already handled by executeAgentWithRetry (retry once with Sonnet)
      // If we're here, both attempts failed.
      // Action: proceed without this agent, flag in output
      emitEvent(state, 'agent_failed', {
        specialist: error.agent_id,
        error: error.type,
        recoverable: true,
      });
      return 'continue';
    }

    // ---- Recoverable: evidence failures ----
    case 'evidence_timeout':
    case 'evidence_api_error': {
      // Evidence pipeline handles its own degradation.
      // Perplexity down → use PubMed direct search.
      // DrugBank down → agents flag "interaction check unavailable."
      // PubMed down → citations marked "unverified."
      return 'continue';
    }

    // ---- Recoverable: classification error ----
    case 'classification_error': {
      // Retry classifier once. If still fails, try GPT-4.1 as fallback.
      // If GPT-4.1 also fails, this becomes fatal.
      try {
        const fallbackResult = await classifyWithFallback(state);
        state.classification = fallbackResult;
        return 'continue';
      } catch {
        return 'fail';
      }
    }

    // ---- Fatal: all agents failed ----
    case 'all_agents_failed': {
      if (error.round === 1) {
        // Cannot produce any specialist output. This is fatal.
        state.status = 'failed';
        return 'fail';
      }
      // Round 2 or 3: we have Round 1 data. Synthesize what we have.
      return 'synthesize_early';
    }

    // ---- Fatal: consultation timeout ----
    case 'consultation_timeout': {
      // Emergency synthesis with whatever is available
      return 'synthesize_early';
    }

    // ---- Fatal: classification permanently failed ----
    case 'classification_failed_after_retry': {
      state.status = 'failed';
      return 'fail';
    }

    // ---- Fatal: database error ----
    case 'database_error': {
      // Store error, return failure to client
      state.status = 'failed';
      return 'fail';
    }

    default:
      return 'fail';
  }
}
```

---

## 11. SSE Event Format

The SSE controller manages the event stream, heartbeat, and reconnection support.

```typescript
// ═══════════════════════════════════════════════════════
// SSE event emitter — sends real-time progress to client
// ═══════════════════════════════════════════════════════

type SSEEventType =
  | 'safety_check'
  | 'classified'
  | 'evidence_progress'
  | 'evidence_ready'
  | 'agent_started'
  | 'agent_complete'
  | 'agent_failed'
  | 'round_1_complete'
  | 'budget_update'
  | 'round_2_complete'
  | 'round_3_complete'
  | 'round_3_skipped'
  | 'synthesis_complete'
  | 'safety_verified'
  | 'completed'
  | 'error'
  | 'heartbeat'
  | 'phase_transition';

interface SSEController {
  /** Emit a typed event to the connected client */
  emit(event: SSEEventType, payload: Record<string, unknown>): void;

  /** Start the heartbeat interval */
  startHeartbeat(): void;

  /** Stop heartbeat and close the connection */
  close(): void;

  /** Get all events for reconnection replay */
  getEventsSince(lastEventId: number): OrchestrationEvent[];
}

function createSSEController(
  state: OrchestratorState,
  writer: WritableStreamDefaultWriter<Uint8Array>
): SSEController {
  const encoder = new TextEncoder();
  let heartbeatInterval: NodeJS.Timeout | null = null;

  function emit(event: SSEEventType, payload: Record<string, unknown>): void {
    state.event_counter++;
    const eventObj: OrchestrationEvent = {
      id: state.event_counter,
      event,
      data: {
        phase: state.status,
        timestamp: new Date().toISOString(),
        payload,
      },
    };

    // Store for replay
    state.events.push(eventObj);

    // Write to SSE stream
    const sseString = [
      `id: ${eventObj.id}`,
      `event: ${eventObj.event}`,
      `data: ${JSON.stringify(eventObj.data)}`,
      '',
      '',  // Double newline terminates the event
    ].join('\n');

    writer.write(encoder.encode(sseString)).catch(() => {
      // Client disconnected — orchestration continues, result retrievable via GET
    });
  }

  function startHeartbeat(): void {
    heartbeatInterval = setInterval(() => {
      emit('heartbeat', {});
    }, TIMEOUTS.sse_heartbeat);
  }

  function close(): void {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    writer.close().catch(() => {});
  }

  function getEventsSince(lastEventId: number): OrchestrationEvent[] {
    return state.events.filter(e => e.id > lastEventId);
  }

  return { emit, startHeartbeat, close, getEventsSince };
}
```

### Event Flow by Phase

| Phase | Events Emitted | Payload |
|-------|---------------|---------|
| Safety pre-check | `safety_check` | `{ passed, urgency, matched_patterns? }` |
| Classification | `classified` | `{ intent, domains, complexity_score, specialists[], budget_tier }` |
| Evidence retrieval | `evidence_progress` (multiple) | `{ step, status }` per pipeline step |
| Evidence retrieval | `evidence_ready` | `{ citations_count, verified_count, interactions_count, status }` |
| Round 1 | `agent_started` (per agent) | `{ specialist, model }` |
| Round 1 | `agent_complete` (per agent) | `{ specialist, findings_count, recommendations_count, time_ms }` |
| Round 1 | `agent_failed` (if any) | `{ specialist, error, recoverable }` |
| Round 1 | `round_1_complete` | `{ agents_completed, agents_failed, findings_count, conflicts_detected }` |
| Budget check | `budget_update` | `{ spent_usd, remaining_usd, pct_spent, action }` |
| Round 2 | Same per-agent events | Same shape |
| Round 2 | `round_2_complete` | `{ agreements_count, disagreements_count, unresolved_count }` |
| Round 3 | `round_3_complete` or `round_3_skipped` | `{ resolutions, deferred_concerns }` or `{ reason }` |
| Synthesis | `synthesis_complete` | `{ consensus_reached, recommendation_count, consensus_level }` |
| Safety post-check | `safety_verified` | `{ flags_count, urgency, wrappers_applied }` |
| Finalization | `completed` | `{ consultation_id, total_cost_usd, total_rounds, recommendation_count }` |
| Error (any) | `error` | `{ phase, message, recoverable, details? }` |

---

## 12. Main Orchestration Loop

The top-level function that ties everything together. This is the entry point called by `POST /api/consult`.

```typescript
// ═══════════════════════════════════════════════════════
// Main orchestration loop -- called by the /api/consult
// route handler after initial validation
// ═══════════════════════════════════════════════════════

async function runConsultation(
  consultationId: string,
  userId: string,
  request: ConsultationRequest,
  sseController: SSEController
): Promise<OrchestratorState> {

  const timer = new ConsultationTimer();
  const state = initializeState(consultationId, userId, request);
  sseController.startHeartbeat();

  try {
    // ═══════════ PHASE 1: SAFETY PRE-CHECK ═══════════
    state.status = 'classifying';
    const safetyResult = await runSafetyPrecheck(request.question, state.patient_profile);

    sseController.emit('safety_check', {
      passed: safetyResult.passed,
      urgency: safetyResult.urgency,
    });

    if (safetyResult.classification === 'TRUE_EMERGENCY') {
      state.status = 'completed';
      state.termination_reason = 'emergency_synthesis';
      sseController.emit('completed', {
        consultation_id: consultationId,
        emergency: true,
        response: safetyResult.emergency_response,
      });
      await storeConsultation(state);
      return state;
    }

    // ═══════════ PHASE 2: CLASSIFICATION ═══════════
    const classification = await withTimeout(
      classifyQuestion(request.question, state.patient_profile),
      30_000,
      'classification'
    );
    state.classification = classification;
    state.budget.tier = selectBudgetTier(classification.complexity_score);

    sseController.emit('classified', {
      intent: classification.intent,
      domains: classification.domains,
      complexity_score: classification.complexity_score,
      specialists: classification.specialists.map(s => s.specialist_type),
      budget_tier: state.budget.tier,
    });

    // ═══════════ PHASE 3: EVIDENCE RETRIEVAL ═══════════
    state.status = 'retrieving_evidence';
    state.evidence_package = await withTimeout(
      retrieveEvidence(classification, state.patient_profile, (step, status) => {
        sseController.emit('evidence_progress', { step, status });
      }),
      TIMEOUTS.evidence_pipeline,
      'evidence_pipeline'
    ).catch(err => {
      // Evidence timeout — build minimal package from patient data only
      sseController.emit('evidence_progress', {
        step: 'pipeline', status: 'timeout', error: String(err),
      });
      return buildMinimalEvidencePackage(state.patient_profile);
    });

    sseController.emit('evidence_ready', {
      citations_count: state.evidence_package.citations.length,
      verified_count: state.evidence_package.citations.filter(c => c.verification_status === 'verified').length,
      interactions_count: state.evidence_package.interactions.length,
      status: state.evidence_package.retrieval_metadata.overall_status,
    });

    // Load outcome history for returning users
    state.outcome_history = await buildOutcomeContext(userId);

    // ═══════════ PHASE 4: ROUND 1 ═══════════
    await executeRound1(state);

    // Check: at least 1 agent must succeed
    if (state.round_1_outputs.size === 0) {
      throw { type: 'all_agents_failed', round: 1 } as FatalError;
    }

    // Budget check
    state.budget = recordBudgetCheckpoint(state.budget);
    sseController.emit('budget_update', {
      spent_usd: state.budget.total_cost_usd,
      remaining_usd: state.budget.tier.max_cost_usd - state.budget.total_cost_usd,
      pct_spent: state.budget.total_cost_usd / state.budget.tier.max_cost_usd,
      action: state.budget.action,
    });

    if (state.budget.action === 'HARD_STOP') {
      // Skip to synthesis
      state.termination_reason = 'budget_exceeded';
    } else {
      // Apply degradation if needed
      if (state.budget.action === 'DEGRADE') {
        applyDegradation(state);
      }

      // ═══════════ PHASE 5: ROUND 2 ═══════════
      if (timer.hasTimeFor(60_000)) {
        await executeRound2(state);

        // Budget check #2
        state.budget = recordBudgetCheckpoint(state.budget);
        sseController.emit('budget_update', {
          spent_usd: state.budget.total_cost_usd,
          remaining_usd: state.budget.tier.max_cost_usd - state.budget.total_cost_usd,
          pct_spent: state.budget.total_cost_usd / state.budget.tier.max_cost_usd,
          action: state.budget.action,
        });

        // Consensus check
        const consensus = detectConsensus(state);

        if (!consensus.termination_recommendation.terminate) {
          // ═══════════ PHASE 6: ROUND 3 (conditional) ═══════════
          if (timer.hasTimeFor(30_000) && state.budget.action !== 'HARD_STOP') {
            await executeRound3(state);
          } else {
            sseController.emit('round_3_skipped', {
              reason: timer.hasTimeFor(30_000) ? 'budget_limit' : 'time_limit',
            });
          }
        }

        state.termination_reason = consensus.termination_recommendation.reason;
      }
    }

    // ═══════════ PHASE 7: SYNTHESIS ═══════════
    state.status = 'synthesizing';
    sseController.emit('phase_transition', { phase: 'synthesizing' });

    state.synthesis = await generateSynthesis(state);

    sseController.emit('synthesis_complete', {
      consensus_reached: state.unresolved_disagreements.length === 0,
      recommendation_count: state.synthesis.recommendations.length,
      consensus_level: state.synthesis.consensus_level,
    });

    // ═══════════ PHASE 8: SAFETY POST-CHECK ═══════════
    state.status = 'safety_checking';
    sseController.emit('phase_transition', { phase: 'safety_checking' });

    state.safety_postcheck = await runSafetyPostcheck(state.synthesis, state.patient_profile);

    // Apply safety wrappers to output
    if (state.safety_postcheck.wrappers.length > 0) {
      state.synthesis = applySafetyWrappers(state.synthesis, state.safety_postcheck.wrappers);
    }

    sseController.emit('safety_verified', {
      flags_count: state.safety_postcheck.flags.length,
      urgency: state.safety_postcheck.urgency,
      wrappers_applied: state.safety_postcheck.wrappers.map(w => w.type),
    });

    // ═══════════ PHASE 9: STORE + FINALIZE ═══════════
    state.status = 'completed';
    state.completed_at = new Date().toISOString();

    // Compute quality metrics
    state.quality_metrics = computeQualityMetrics(state);

    // Store to database
    await storeConsultation(state);
    await storeRecommendations(state);
    await scheduleFollowups(state);

    sseController.emit('completed', {
      consultation_id: consultationId,
      total_cost_usd: state.budget.total_cost_usd,
      total_rounds: countRounds(state),
      recommendation_count: state.synthesis.recommendations.length,
      quality_metrics: state.quality_metrics,
    });

    return state;

  } catch (error) {
    // Handle fatal errors
    const action = await handleError(state, error as FatalError);

    if (action === 'synthesize_early') {
      // Emergency synthesis with whatever we have
      state.status = 'synthesizing';
      state.synthesis = await generateEmergencySynthesis(state);
      state.status = 'completed';
      state.termination_reason = 'emergency_synthesis';
      state.completed_at = new Date().toISOString();
      await storeConsultation(state);

      sseController.emit('completed', {
        consultation_id: consultationId,
        emergency_synthesis: true,
        total_cost_usd: state.budget.total_cost_usd,
      });
      return state;
    }

    // True failure
    state.status = 'failed';
    sseController.emit('error', {
      phase: state.status,
      message: error instanceof Error ? error.message : 'Unknown error',
      recoverable: false,
    });
    await storeConsultation(state);
    return state;

  } finally {
    timer.cancel();
    sseController.close();
  }
}


/** Count how many discussion rounds were completed */
function countRounds(state: OrchestratorState): number {
  let rounds = 0;
  if (state.round_1_outputs.size > 0) rounds++;
  if (state.round_2_outputs.size > 0) rounds++;
  if (state.round_3_outputs.size > 0) rounds++;
  return rounds;
}


/** Initialize a fresh orchestrator state */
function initializeState(
  consultationId: string,
  userId: string,
  request: ConsultationRequest
): OrchestratorState {
  return {
    consultation_id: consultationId,
    user_id: userId,
    profile_id: request.profile_id,
    profile_version: 0,       // Set after profile load
    status: 'classifying',
    started_at: new Date().toISOString(),
    question: { text: request.question, context: request.context },
    patient_profile: null!,   // Loaded from Supabase
    data_validation: null!,   // Computed after profile load
    completeness: null!,      // Computed after profile load
    round_1_outputs: new Map(),
    round_1_failed: new Map(),
    cross_domain_conflicts: [],
    round_2_outputs: new Map(),
    round_2_failed: new Map(),
    unresolved_disagreements: [],
    round_3_outputs: new Map(),
    deferred_concerns: [],
    budget: {
      tier: BUDGET_TIERS.moderate,  // Updated after classification
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      calls: [],
      action: 'PROCEED',
      degradation_applied: [],
    },
    events: [],
    event_counter: 0,
  };
}
```

---

## 13. Temperature and Seed Configuration

Temperature and seed values control reproducibility. Values from DISCUSSION-PROTOCOL.md Section 3.

```typescript
const TEMPERATURE_CONFIG: Record<string, number> = {
  classification:    0.2,   // Deterministic routing
  evidence_query:    0.3,   // Consistent search queries
  round_1:           0.3,   // Consistent clinical analysis
  round_2:           0.4,   // Allow genuine disagreement
  round_3:           0.2,   // Precise resolution
  synthesis:         0.2,   // Stable final output
  devils_advocate:   0.6,   // Creative counter-arguments
  safety_check:      0.1,   // Maximum consistency for safety
  followup:          0.3,   // Consistent follow-up answers
};

function computeSeed(state: OrchestratorState, phase: string): number {
  // Deterministic seed from case data (weekly bucket for natural model evolution)
  const rawSeed = hashString([
    state.user_id,
    state.question.text,
    JSON.stringify(state.patient_profile?.demographics ?? {}),
    weekBucket(state.started_at),  // Same case in same week → same seed
    phase,
  ].join('|'));

  return rawSeed % (2 ** 32);
}

function weekBucket(isoDate: string): string {
  const d = new Date(isoDate);
  const year = d.getFullYear();
  const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${year}-W${week}`;
}
```

---

## 14. Information Gain Computation

Used to decide whether Round 3 adds enough value to justify its cost. Simplified implementation that avoids embedding computation for MVP.

```typescript
function computeInformationGain(
  currentRoundOutputs: AgentOutput[],
  previousRoundOutputs: AgentOutput[]
): number {
  // Extract structured claims from each round
  const previousClaims = extractClaims(previousRoundOutputs);
  const currentClaims = extractClaims(currentRoundOutputs);

  // Count genuinely new recommendations (not restated)
  const previousRecIds = new Set(
    previousRoundOutputs.flatMap(o =>
      (o.recommendations ?? []).map(r => normalizeRecommendation(r))
    )
  );

  const newRecommendations = currentRoundOutputs.flatMap(o =>
    (o.updated_recommendations ?? []).filter(r => r.change_type !== 'strengthened')
  );

  // Count new disagreements (unique topics not in previous round)
  const previousTopics = new Set(
    previousRoundOutputs.flatMap(o =>
      (o.disagreements ?? []).map(d => d.topic ?? d.their_recommendation_id)
    )
  );

  const newDisagreements = currentRoundOutputs.flatMap(o =>
    (o.disagreements ?? []).filter(d => {
      const topic = d.topic ?? d.their_recommendation_id;
      return !previousTopics.has(topic);
    })
  );

  // Information gain formula
  const totalCurrentClaims = currentClaims.length || 1;
  const newInfo = newRecommendations.length + newDisagreements.length;
  const modifiedInfo = currentRoundOutputs.flatMap(o =>
    (o.updated_recommendations ?? []).filter(r => r.change_type === 'modified')
  ).length;

  return (newInfo + 0.5 * modifiedInfo) / totalCurrentClaims;
}

function extractClaims(outputs: AgentOutput[]): string[] {
  const claims: string[] = [];
  for (const output of outputs) {
    if (output.findings) {
      claims.push(...output.findings.map(f => f.description));
    }
    if (output.recommendations) {
      claims.push(...output.recommendations.map(r => r.action));
    }
  }
  return claims;
}

function normalizeRecommendation(rec: { action: string; type?: string }): string {
  return `${rec.type ?? 'unknown'}::${rec.action.toLowerCase().trim().slice(0, 100)}`;
}
```

---

## 15. Quality Metrics

Computed after synthesis, before storage. These metrics are stored alongside the consultation and drive the feedback loop.

```typescript
interface QualityMetrics {
  value_added_score: number;         // > 1.15 = multi-agent justified
  diversity_score: number;           // 1 - avg pairwise similarity
  information_gain_per_round: number[];  // Per round, 0.0-1.0
  profile_completeness: number;      // 0.0-1.0
  evidence_coverage: number;         // Ratio of verified citations
  summary_hash: string;              // SHA-256 for reproducibility
}

function computeQualityMetrics(state: OrchestratorState): QualityMetrics {
  const round1Outputs = Array.from(state.round_1_outputs.values());
  const round2Outputs = Array.from(state.round_2_outputs.values());
  const round3Outputs = Array.from(state.round_3_outputs.values());

  // Diversity: 1 - average pairwise recommendation overlap
  const diversityScore = computeDiversityScore(round1Outputs);

  // Information gain per round
  const infoGain: number[] = [];
  if (round2Outputs.length > 0) {
    infoGain.push(computeInformationGain(round2Outputs, round1Outputs));
  }
  if (round3Outputs.length > 0) {
    infoGain.push(computeInformationGain(round3Outputs, round2Outputs));
  }

  // Evidence coverage
  const totalCitations = state.evidence_package?.citations.length ?? 0;
  const verifiedCitations = state.evidence_package?.citations.filter(
    c => c.verification_status === 'verified'
  ).length ?? 0;
  const evidenceCoverage = totalCitations > 0 ? verifiedCitations / totalCitations : 0;

  // Summary hash
  const hashInput = JSON.stringify({
    recommendations: state.synthesis?.recommendations.map(r => ({
      type: r.type, action: r.action, priority: r.priority,
    })),
    consensus_reached: state.unresolved_disagreements.length === 0,
    specialists: state.classification?.specialists.map(s => s.specialist_type),
  });
  const summaryHash = sha256(hashInput);

  return {
    value_added_score: 0, // Computed separately via A/B test framework; placeholder for MVP
    diversity_score: diversityScore,
    information_gain_per_round: infoGain,
    profile_completeness: state.completeness.score,
    evidence_coverage: evidenceCoverage,
    summary_hash: summaryHash,
  };
}

function computeDiversityScore(outputs: AgentOutput[]): number {
  if (outputs.length < 2) return 1.0;

  const similarities: number[] = [];

  for (let i = 0; i < outputs.length; i++) {
    for (let j = i + 1; j < outputs.length; j++) {
      const recsA = new Set((outputs[i].recommendations ?? []).map(r => normalizeRecommendation(r)));
      const recsB = new Set((outputs[j].recommendations ?? []).map(r => normalizeRecommendation(r)));

      const intersection = new Set([...recsA].filter(x => recsB.has(x)));
      const union = new Set([...recsA, ...recsB]);
      const jaccard = union.size > 0 ? intersection.size / union.size : 0;

      similarities.push(jaccard);
    }
  }

  const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
  return 1.0 - avgSimilarity;
}
```

---

## 16. Exports

The orchestrator module exports these functions for use by the API route handler:

```typescript
// src/lib/agents/orchestrator.ts

export {
  runConsultation,           // Main entry point
  createSSEController,       // SSE stream management
  type OrchestratorState,    // For type consumers
  type ConsultationRequest,  // Request type
  type SSEEventType,         // SSE event types
  type BudgetTier,           // Budget configuration
};
```

The route handler in `src/app/api/consult/route.ts` calls `runConsultation()` after validating the request, loading the profile, and creating the SSE stream.
