# Cost Management System -- MedPanel AI

**Spec Phase:** 3.6
**Upstream:** `DISCUSSION-PROTOCOL.md` (Section 1d cost controls), `SERVICES-MANIFEST.md` (cost per consultation estimates), `shared-definitions.json` (budget_tier, model_tier, termination_reason)
**Downstream:** `src/lib/cost/` (token tracking, budget enforcement, degradation controller), Stripe integration (billing), SSE cost events (UI)

---

## 1. Token Counting

### 1a. Post-Call Counting (Exact)

The Anthropic SDK returns exact token usage in every response. This is the source of truth for cost tracking.

```typescript
// Anthropic SDK response shape (relevant fields)
interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

// After every LLM call, extract and record:
interface TokenUsageRecord {
  call_id: string; // UUID for this specific API call
  consultation_id: string;
  round: 1 | 2 | 3 | 'classification' | 'synthesis' | 'safety';
  agent: string; // e.g., "cardiologist", "moderator", "classifier"
  model: ModelId;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number; // Anthropic prompt caching
  cache_write_tokens: number;
  cost_usd: number; // Calculated from tokens + model pricing
  timestamp: string; // ISO 8601
  duration_ms: number; // Wall clock time for the call
}

type ModelId =
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5'
  | 'gpt-4.1'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'sonar-pro'
  | 'sonar'
  | 'sonar-deep-research';
```

### 1b. Pre-Call Estimation (Approximate)

Before making an LLM call, estimate token count to check if the call fits within the remaining budget. This prevents starting a call that would exceed the ceiling.

```typescript
/**
 * Estimate input token count before calling the API.
 *
 * Approach: Character-based approximation.
 * For English text, 1 token ≈ 4 characters (conservative).
 * For structured JSON, 1 token ≈ 3.5 characters (JSON syntax adds tokens).
 *
 * This is intentionally conservative (overestimates tokens) to avoid
 * budget overruns. The exact count from the API response replaces this.
 */
function estimateInputTokens(payload: string): number {
  const charCount = payload.length;
  // Conservative: assume 3.5 chars per token for mixed content
  return Math.ceil(charCount / 3.5);
}

/**
 * Estimate output tokens based on the max_tokens parameter we set.
 * Worst case: the model uses all of max_tokens.
 * Expected case: ~60-80% of max_tokens for well-constrained outputs.
 */
function estimateOutputTokens(maxTokens: number): number {
  // Budget against worst case
  return maxTokens;
}

/**
 * Pre-call budget check. Returns whether the call should proceed.
 */
function canAffordCall(
  estimatedInputTokens: number,
  maxOutputTokens: number,
  model: ModelId,
  budgetState: BudgetState,
): { proceed: boolean; estimatedCost: number; remainingAfter: number } {
  const estimatedCost = calculateCost(
    estimatedInputTokens,
    maxOutputTokens,
    model,
  );
  const remainingAfter = budgetState.remaining_usd - estimatedCost;

  return {
    proceed: remainingAfter > 0,
    estimatedCost,
    remainingAfter,
  };
}
```

### 1c. Running Total Tracking

```typescript
/**
 * Mutable budget state maintained throughout a consultation.
 * Updated after every API call with exact token counts.
 */
interface BudgetState {
  consultation_id: string;
  tier: 'simple' | 'moderate' | 'complex';
  ceiling_usd: number; // From budget tier
  ceiling_tokens: number; // From budget tier
  spent_usd: number;
  spent_tokens: number; // Total input + output
  remaining_usd: number; // ceiling_usd - spent_usd
  remaining_tokens: number;
  calls: TokenUsageRecord[]; // Full audit trail
  degradation_level: 0 | 1 | 2 | 3 | 4 | 5; // Current degradation level
  warnings: string[]; // Accumulated warnings
}

/**
 * Update budget state after an API call completes.
 */
function recordUsage(
  state: BudgetState,
  record: TokenUsageRecord,
): BudgetState {
  const newSpentUsd = state.spent_usd + record.cost_usd;
  const newSpentTokens = state.spent_tokens + record.input_tokens + record.output_tokens;

  return {
    ...state,
    spent_usd: newSpentUsd,
    spent_tokens: newSpentTokens,
    remaining_usd: state.ceiling_usd - newSpentUsd,
    remaining_tokens: state.ceiling_tokens - newSpentTokens,
    calls: [...state.calls, record],
  };
}
```

---

## 2. Cost Calculation

### 2a. Price Table

All prices per 1 million tokens (or per call for non-LLM APIs). Prices current as of spec date; update when providers change pricing.

| Service | Model | Input (per 1M tokens) | Output (per 1M tokens) | Cache Read (per 1M) | Cache Write (per 1M) |
|---------|-------|----------------------|----------------------|---------------------|---------------------|
| Anthropic | `claude-opus-4-6` | $15.00 | $75.00 | $1.50 | $18.75 |
| Anthropic | `claude-sonnet-4-6` | $3.00 | $15.00 | $0.30 | $3.75 |
| Anthropic | `claude-haiku-4-5` | $0.80 | $4.00 | $0.08 | $1.00 |
| OpenAI | `gpt-4.1` | $2.00 | $8.00 | — | — |
| OpenAI | `gpt-4o` | $2.50 | $10.00 | — | — |
| OpenAI | `gpt-4o-mini` | $0.15 | $0.60 | — | — |
| Perplexity | `sonar-pro` | — | — | — | — |
| Perplexity | `sonar` | — | — | — | — |

| Service | Model | Per-Request Cost | Notes |
|---------|-------|-----------------|-------|
| Perplexity | `sonar-pro` | $0.005/request + $5/1M input + $15/1M output | Search + reasoning |
| Perplexity | `sonar` | $0.005/request + $1/1M input + $1/1M output | Lightweight search |
| Perplexity | `sonar-deep-research` | $0.005/request + $2/1M input + $8/1M output | Deep research mode |
| DrugBank | API | Free (academic) / ~$0.08/call (commercial) | Rate-limited |
| PubMed | E-utilities | Free | Rate: 10 req/sec with API key |
| OpenFDA | API | Free | Rate: 240 req/min with API key |
| RxNorm | API | Free | No rate limit documented |

### 2b. Cost Calculation Function

```typescript
const PRICING: Record<ModelId, { input_per_m: number; output_per_m: number; cache_read_per_m?: number; cache_write_per_m?: number }> = {
  'claude-opus-4-6':   { input_per_m: 15.00, output_per_m: 75.00, cache_read_per_m: 1.50,  cache_write_per_m: 18.75 },
  'claude-sonnet-4-6':   { input_per_m: 3.00,  output_per_m: 15.00, cache_read_per_m: 0.30,  cache_write_per_m: 3.75 },
  'claude-haiku-4-5':  { input_per_m: 0.80,  output_per_m: 4.00,  cache_read_per_m: 0.08,  cache_write_per_m: 1.00 },
  'gpt-4.1':           { input_per_m: 2.00,  output_per_m: 8.00 },
  'gpt-4o':            { input_per_m: 2.50,  output_per_m: 10.00 },
  'gpt-4o-mini':       { input_per_m: 0.15,  output_per_m: 0.60 },
  'sonar-pro':         { input_per_m: 5.00,  output_per_m: 15.00 },
  'sonar':             { input_per_m: 1.00,  output_per_m: 1.00 },
  'sonar-deep-research': { input_per_m: 2.00, output_per_m: 8.00 },
};

const PERPLEXITY_PER_REQUEST_FEE = 0.005; // $0.005 per search request

/**
 * Calculate exact cost from token usage and model.
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelId,
  cacheReadTokens: number = 0,
  cacheWriteTokens: number = 0,
  isPerplexityRequest: boolean = false,
): number {
  const pricing = PRICING[model];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  let cost = 0;

  // Standard input/output costs
  cost += (inputTokens / 1_000_000) * pricing.input_per_m;
  cost += (outputTokens / 1_000_000) * pricing.output_per_m;

  // Cache costs (Anthropic only)
  if (pricing.cache_read_per_m && cacheReadTokens > 0) {
    cost += (cacheReadTokens / 1_000_000) * pricing.cache_read_per_m;
  }
  if (pricing.cache_write_per_m && cacheWriteTokens > 0) {
    cost += (cacheWriteTokens / 1_000_000) * pricing.cache_write_per_m;
  }

  // Perplexity per-request fee
  if (isPerplexityRequest) {
    cost += PERPLEXITY_PER_REQUEST_FEE;
  }

  return Math.round(cost * 1_000_000) / 1_000_000; // 6 decimal places
}
```

### 2c. Cumulative Cost Tracking

```typescript
/**
 * Full consultation cost breakdown.
 * Generated at end of consultation, stored with consultation record.
 */
interface ConsultationCostBreakdown {
  consultation_id: string;
  tier: 'simple' | 'moderate' | 'complex';
  ceiling_usd: number;

  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cache_write_tokens: number;

  // Per-phase breakdown
  classification: PhaseCost;
  evidence_retrieval: PhaseCost;
  round_1: PhaseCost;
  round_2?: PhaseCost; // May not exist if degradation skipped it
  round_3?: PhaseCost;
  synthesis: PhaseCost;
  safety_check: PhaseCost;
  cross_verification?: PhaseCost; // Optional GPT cross-check

  // Per-model breakdown
  by_model: Record<ModelId, {
    calls: number;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
  }>;

  // Per-agent breakdown
  by_agent: Record<string, {
    model: ModelId;
    rounds_participated: number[];
    total_cost_usd: number;
  }>;

  // Degradation info
  degradation_applied: boolean;
  degradation_level_reached: 0 | 1 | 2 | 3 | 4 | 5;
  degradation_savings_usd: number; // Estimated savings from degradation

  // Timing
  total_duration_ms: number;
  started_at: string;
  completed_at: string;
}

interface PhaseCost {
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  calls: number;
  models_used: ModelId[];
}
```

---

## 3. Budget Tiers

### 3a. Tier Definitions

Derived from `shared-definitions.json` `budget_tier` and `DISCUSSION-PROTOCOL.md` cost estimates.

| Tier | Complexity Score | Max Cost (USD) | Max Tokens | Typical Shape |
|------|-----------------|----------------|------------|---------------|
| **Simple** | 0.0 - 2.5 | $5.00 | 60,000 | 1-2 specialists, 1-2 rounds, Haiku classification + Sonnet synthesis |
| **Moderate** | 2.6 - 6.5 | $15.00 | 200,000 | 3 specialists, 2-3 rounds, Opus lead + Sonnet supporting |
| **Complex** | 6.6 - 10.0 | $25.00 | 400,000 | 4-5 specialists, 3 rounds, Opus-heavy, cross-verification |

### 3b. Tier Selection

```typescript
interface BudgetTier {
  tier: 'simple' | 'moderate' | 'complex';
  complexity_range: string;
  max_cost_usd: number;
  max_total_tokens: number;
  typical_specialists: number;
  typical_rounds: number;
  model_strategy: ModelStrategy;
}

interface ModelStrategy {
  classification: ModelId;
  lead_specialists: ModelId; // Top 1-2 specialists by signal strength
  supporting_specialists: ModelId;
  synthesis: ModelId;
  safety: ModelId;
}

const BUDGET_TIERS: Record<string, BudgetTier> = {
  simple: {
    tier: 'simple',
    complexity_range: '0.0-2.5',
    max_cost_usd: 5.00,
    max_total_tokens: 50_000,
    typical_specialists: 2,
    typical_rounds: 2,
    model_strategy: {
      classification: 'claude-haiku-4-5',
      lead_specialists: 'claude-sonnet-4-6', // Sonnet sufficient for simple cases
      supporting_specialists: 'claude-sonnet-4-6',
      synthesis: 'claude-sonnet-4-6',
      safety: 'claude-haiku-4-5',
    },
  },
  moderate: {
    tier: 'moderate',
    complexity_range: '2.6-6.5',
    max_cost_usd: 15.00,
    max_total_tokens: 150_000,
    typical_specialists: 3,
    typical_rounds: 3,
    model_strategy: {
      classification: 'claude-haiku-4-5',
      lead_specialists: 'claude-opus-4-6',
      supporting_specialists: 'claude-sonnet-4-6',
      synthesis: 'claude-sonnet-4-6',
      safety: 'claude-haiku-4-5',
    },
  },
  complex: {
    tier: 'complex',
    complexity_range: '6.6-10.0',
    max_cost_usd: 25.00,
    max_total_tokens: 300_000,
    typical_specialists: 5,
    typical_rounds: 3,
    model_strategy: {
      classification: 'claude-haiku-4-5',
      lead_specialists: 'claude-opus-4-6',
      supporting_specialists: 'claude-opus-4-6', // All Opus for complex
      synthesis: 'claude-sonnet-4-6',
      safety: 'claude-haiku-4-5',
    },
  },
};

/**
 * Select budget tier from classifier's complexity score.
 */
function selectBudgetTier(complexityScore: number): BudgetTier {
  if (complexityScore <= 2.5) return BUDGET_TIERS.simple;
  if (complexityScore < 7.0) return BUDGET_TIERS.moderate;
  return BUDGET_TIERS.complex;
}
```

### 3c. Token Budget Per Round Per Agent

Configurable per tier. These are OUTPUT token limits (`max_tokens` in the API call).

```typescript
interface RoundTokenLimits {
  round_1_per_agent: number; // Thorough independent analysis
  round_2_per_agent: number; // Cross-examination (more focused)
  round_3_per_agent: number; // Resolution (laser-focused)
  synthesis: number;         // Moderator synthesis
  safety_check: number;      // Safety verification
}

const TOKEN_LIMITS: Record<string, RoundTokenLimits> = {
  simple: {
    round_1_per_agent: 2000,
    round_2_per_agent: 1500,
    round_3_per_agent: 400,
    synthesis: 3000,
    safety_check: 1000,
  },
  moderate: {
    round_1_per_agent: 3000,
    round_2_per_agent: 2000,
    round_3_per_agent: 500,
    synthesis: 4000,
    safety_check: 1500,
  },
  complex: {
    round_1_per_agent: 3000,
    round_2_per_agent: 2000,
    round_3_per_agent: 500,
    synthesis: 5000,
    safety_check: 2000,
  },
};
```

---

## 4. Degradation Strategy

### 4a. Degradation Levels

5 levels of graceful degradation, applied in order from least impactful to most impactful. Each level triggers at a specific percentage of the budget ceiling.

| Level | Trigger (% spent) | Action | Estimated Savings | Quality Impact |
|-------|-------------------|--------|-------------------|----------------|
| **0** | < 60% | PROCEED — no degradation | None | None |
| **1** | 60% | Reduce Round 3 output tokens to 250 (from 500) | ~2K tokens, ~$0.20 | Minimal: Round 3 is already laser-focused |
| **2** | 70% | Downgrade Round 2+ models to Sonnet | ~60% cost reduction on remaining rounds | Moderate: Sonnet is capable but less nuanced than Opus |
| **3** | 80% | Skip Round 3 entirely | Eliminates all Round 3 costs | Moderate: Unresolved disagreements flagged but not debated |
| **4** | 90% | Drop lowest-signal agent from remaining rounds | ~20-25% reduction | Notable: Fewer perspectives, narrower coverage |
| **5** | 95% | Emergency synthesis — stop all agent calls, synthesize immediately | All remaining budget | Significant: No cross-examination, only Round 1 outputs synthesized |

### 4b. Degradation Controller

```typescript
type DegradationLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface DegradationAction {
  level: DegradationLevel;
  action: string;
  applied: boolean;
  applied_at?: string;
  savings_estimate_usd: number;
}

interface DegradationState {
  current_level: DegradationLevel;
  actions_applied: DegradationAction[];
  agents_dropped: string[]; // Agent names removed by Level 4
  model_downgrades: Array<{ agent: string; from: ModelId; to: ModelId }>; // Level 2
  rounds_skipped: number[]; // e.g., [3] if Round 3 was skipped
}

/**
 * Evaluate budget state and determine if degradation is needed.
 * Called BEFORE every API call in the consultation pipeline.
 */
function evaluateDegradation(budgetState: BudgetState): {
  level: DegradationLevel;
  action: 'proceed' | 'degrade' | 'hard_stop';
  mutations: DegradationMutation[];
} {
  const pctSpent = budgetState.spent_usd / budgetState.ceiling_usd;

  // Level 5: Emergency synthesis (95%+)
  if (pctSpent >= 0.95) {
    return {
      level: 5,
      action: 'hard_stop',
      mutations: [{
        type: 'emergency_synthesis',
        description: 'Immediately synthesize all available outputs. No more agent calls.',
      }],
    };
  }

  // Level 4: Drop lowest-signal agent (90%+)
  if (pctSpent >= 0.90 && budgetState.degradation_level < 4) {
    const lowestSignalAgent = identifyLowestSignalAgent(budgetState);
    return {
      level: 4,
      action: 'degrade',
      mutations: [{
        type: 'drop_agent',
        agent: lowestSignalAgent,
        description: `Drop ${lowestSignalAgent} from remaining rounds (fewest unique findings in Round 1).`,
      }],
    };
  }

  // Level 3: Skip Round 3 (80%+)
  if (pctSpent >= 0.80 && budgetState.degradation_level < 3) {
    return {
      level: 3,
      action: 'degrade',
      mutations: [{
        type: 'skip_round',
        round: 3,
        description: 'Eliminate Round 3. Flag unresolved disagreements in synthesis.',
      }],
    };
  }

  // Level 2: Downgrade models (70%+)
  if (pctSpent >= 0.70 && budgetState.degradation_level < 2) {
    return {
      level: 2,
      action: 'degrade',
      mutations: [{
        type: 'downgrade_models',
        rounds_affected: [2, 3],
        from: 'claude-opus-4-6',
        to: 'claude-sonnet-4-6',
        description: 'Downgrade Round 2+ specialist models from Opus to Sonnet (~60% cost reduction).',
      }],
    };
  }

  // Level 1: Reduce Round 3 tokens (60%+)
  if (pctSpent >= 0.60 && budgetState.degradation_level < 1) {
    return {
      level: 1,
      action: 'degrade',
      mutations: [{
        type: 'reduce_tokens',
        round: 3,
        new_limit: 250,
        description: 'Reduce Round 3 output token limit from 500 to 250.',
      }],
    };
  }

  // Level 0: Proceed normally
  return { level: 0, action: 'proceed', mutations: [] };
}

type DegradationMutation =
  | { type: 'reduce_tokens'; round: number; new_limit: number; description: string }
  | { type: 'downgrade_models'; rounds_affected: number[]; from: ModelId; to: ModelId; description: string }
  | { type: 'skip_round'; round: number; description: string }
  | { type: 'drop_agent'; agent: string; description: string }
  | { type: 'emergency_synthesis'; description: string };

/**
 * Identify which agent contributed the least unique information in Round 1.
 * Used by Level 4 degradation to drop the lowest-signal agent.
 */
function identifyLowestSignalAgent(budgetState: BudgetState): string {
  // Score each agent by:
  // 1. Number of unique findings (findings not mentioned by any other agent)
  // 2. Number of unique safety flags raised
  // 3. Number of drug interactions identified
  // Agent with lowest combined score gets dropped.
  // Tie-breaker: drop the agent with the lowest confidence scores.
  // NEVER drop the internist anchor (always retained for synthesis coherence).

  const round1Calls = budgetState.calls.filter(c => c.round === 1);
  // ... scoring logic per agent ...
  // Return agent name with lowest signal score, excluding internist
  return 'lowest_signal_agent_name';
}

/**
 * Apply degradation mutations to the consultation configuration.
 */
function applyDegradation(
  config: ConsultationConfig,
  mutations: DegradationMutation[],
): ConsultationConfig {
  let updated = { ...config };

  for (const mutation of mutations) {
    switch (mutation.type) {
      case 'reduce_tokens':
        updated.token_limits = {
          ...updated.token_limits,
          [`round_${mutation.round}_per_agent`]: mutation.new_limit,
        };
        break;

      case 'downgrade_models':
        for (const agent of updated.agents) {
          if (agent.model === mutation.from) {
            // Only downgrade non-lead agents in affected rounds
            agent.model_overrides = agent.model_overrides ?? {};
            for (const round of mutation.rounds_affected) {
              agent.model_overrides[round] = mutation.to;
            }
          }
        }
        break;

      case 'skip_round':
        updated.max_rounds = Math.min(updated.max_rounds, mutation.round - 1);
        break;

      case 'drop_agent':
        updated.agents = updated.agents.filter(a => a.name !== mutation.agent);
        break;

      case 'emergency_synthesis':
        updated.force_synthesis = true;
        updated.max_rounds = updated.current_round; // Stop where we are
        break;
    }
  }

  return updated;
}
```

### 4c. Budget-Exceeded Incomplete Consensus

When the budget runs out but specialists still disagree, the system generates a bounded synthesis:

```typescript
interface BudgetLimitedSynthesis {
  status: 'budget_limited_incomplete_consensus';
  areas_of_agreement: AgreementItem[];
  unresolved_disagreements: Array<{
    topic: string;
    position_a: { agent: string; recommendation: string; confidence: number };
    position_b: { agent: string; recommendation: string; confidence: number };
    user_decision_framework: string; // "If [test] shows X, follow A. If Y, follow B."
  }>;
  recommended_next_step: string;
  meta: {
    total_spent_usd: number;
    rounds_completed: number;
    agents_consulted: number;
    completion_percentage: number; // 0-100, how much of the planned discussion was completed
    degradation_level_reached: DegradationLevel;
  };
}
```

---

## 5. User-Facing Cost Display

### 5a. Pre-Consultation Cost Estimate

Before a user starts a consultation, show an estimate based on the complexity classification.

```typescript
interface CostEstimate {
  tier: 'simple' | 'moderate' | 'complex';
  estimated_cost_range: { low: number; high: number }; // USD
  estimated_duration_range: { low: number; high: number }; // seconds
  specialists_count: number;
  rounds_planned: number;
  enhanced_reliability_cost?: { low: number; high: number }; // 3x standard
}

const COST_ESTIMATES: Record<string, { low: number; high: number }> = {
  simple:   { low: 1.00,  high: 3.00 },
  moderate: { low: 4.00,  high: 10.00 },
  complex:  { low: 10.00, high: 20.00 },
};

function generateCostEstimate(
  tier: 'simple' | 'moderate' | 'complex',
  specialistCount: number,
  roundsPlanned: number,
): CostEstimate {
  const range = COST_ESTIMATES[tier];
  return {
    tier,
    estimated_cost_range: range,
    estimated_duration_range: {
      low: tier === 'simple' ? 30 : tier === 'moderate' ? 60 : 90,
      high: tier === 'simple' ? 60 : tier === 'moderate' ? 120 : 180,
    },
    specialists_count: specialistCount,
    rounds_planned: roundsPlanned,
    enhanced_reliability_cost: {
      low: range.low * 3,
      high: range.high * 3,
    },
  };
}
```

**UI presentation:**

```
┌─────────────────────────────────────────────────────────┐
│  Consultation Estimate                                  │
│                                                         │
│  Complexity: Moderate                                   │
│  Specialists: 3 (Endocrinologist, Cardiologist,         │
│               Clinical Pharmacologist)                  │
│  Discussion rounds: Up to 3                             │
│                                                         │
│  Estimated cost: $4.00 - $10.00                         │
│  Estimated time: 1 - 2 minutes                          │
│                                                         │
│  [ ] Enhanced Reliability Mode (+3x cost)               │
│      Runs the full consultation 3 times and identifies  │
│      which findings are consistent across runs.         │
│                                                         │
│  [Start Consultation]                                   │
└─────────────────────────────────────────────────────────┘
```

### 5b. Live Cost Tracking (SSE Events)

During the consultation, stream cost updates to the client via Server-Sent Events (SSE).

```typescript
/**
 * SSE event types for live cost tracking.
 * Sent on the consultation's SSE stream alongside status updates.
 */
type CostEvent =
  | {
      type: 'cost_update';
      data: {
        spent_usd: number;
        ceiling_usd: number;
        pct_spent: number;
        current_phase: string; // "classification", "evidence", "round_1", etc.
        calls_completed: number;
      };
    }
  | {
      type: 'degradation_applied';
      data: {
        level: DegradationLevel;
        action: string; // Human-readable description
        reason: string; // "Budget at 72%, downgrading models for remaining rounds"
      };
    }
  | {
      type: 'cost_final';
      data: ConsultationCostBreakdown;
    };
```

**UI during consultation:**

```
┌─────────────────────────────────────────────────────────┐
│  ● Live  Analyzing with 3 specialists — Round 2         │
│                                                         │
│  ██████████████░░░░░░░░░░  $6.42 / $15.00 (43%)       │
│                                                         │
│  Classification ✓  Evidence ✓  Round 1 ✓  Round 2 ◉    │
│  Round 3 ○  Synthesis ○  Safety ○                       │
└─────────────────────────────────────────────────────────┘
```

### 5c. Post-Consultation Cost Breakdown

After consultation completes, show a detailed breakdown.

```
┌─────────────────────────────────────────────────────────┐
│  Consultation Complete — Cost Breakdown                  │
│                                                         │
│  Total: $8.73 of $15.00 budget                          │
│                                                         │
│  Phase              Cost      Tokens                    │
│  ─────────────────  ────────  ───────                   │
│  Classification     $0.02     1,200                     │
│  Evidence           $0.31     4,800                     │
│  Round 1 (3 agents) $3.24     42,100                    │
│  Round 2 (3 agents) $3.18     38,600                    │
│  Round 3 (3 agents) $0.82     9,200                     │
│  Synthesis          $0.74     12,400                    │
│  Safety Check       $0.42     8,100                     │
│  ─────────────────  ────────  ───────                   │
│  Total              $8.73     116,400                   │
│                                                         │
│  Models used: Opus (3 agents R1), Sonnet (R2-3),        │
│               Haiku (classify + safety), Sonar Pro       │
│  Duration: 87 seconds                                   │
│  Degradation: Level 2 applied (model downgrade R2+)     │
└─────────────────────────────────────────────────────────┘
```

### 5d. Enhanced Reliability Mode

"Enhanced Reliability Mode" runs the complete consultation 3 times with different seeds and compares outputs for stability.

```typescript
interface EnhancedReliabilityResult {
  runs: ConsultationCostBreakdown[]; // 3 runs
  total_cost_usd: number; // Sum of all 3 runs
  stability_analysis: {
    stable_recommendations: string[]; // Consistent across all 3 runs
    unstable_recommendations: string[]; // Varied across runs
    stability_score: number; // 0.0 - 1.0 (stable / total)
    confidence_variance: Record<string, number>; // Per-recommendation confidence CV
  };
}

// Pricing: 3x the standard consultation cost
// User sees: "Enhanced Reliability: $12.00 - $30.00 (Moderate tier)"
// Consent: user must explicitly opt in before starting
```

---

## 6. Billing Architecture (Future)

### 6a. Stripe Integration Points

```typescript
interface BillingConfig {
  provider: 'stripe';
  currency: 'usd';

  // Stripe entities
  customer: string; // Stripe customer ID, linked to Supabase user
  subscription?: string; // Stripe subscription ID (if subscription model)
  payment_method: string; // Stripe payment method ID

  // MedPanel-specific
  billing_model: 'credits' | 'pay_per_consultation' | 'subscription';
  free_tier_remaining?: number; // Credits or consultations remaining
}

// Stripe webhook events to handle:
// - checkout.session.completed → activate account / add credits
// - invoice.payment_succeeded → renew subscription / add credits
// - invoice.payment_failed → suspend new consultations, retain data
// - customer.subscription.deleted → downgrade to free tier
// - charge.refunded → reverse credits if applicable
```

### 6b. Billing Models

#### Model A: Credit System (Recommended for Launch)

```typescript
interface CreditSystem {
  model: 'credits';

  // Credit packages
  packages: [
    { credits: 10,  price_usd: 9.99,   per_credit: 1.00 },  // Starter
    { credits: 30,  price_usd: 24.99,  per_credit: 0.83 },  // Standard
    { credits: 100, price_usd: 69.99,  per_credit: 0.70 },  // Power user
  ];

  // Credit consumption
  // 1 credit = $1.00 of consultation cost
  // Simple consultation (~$2): 2 credits
  // Moderate consultation (~$8): 8 credits
  // Complex consultation (~$18): 18 credits
  // Enhanced Reliability: 3x standard credits

  // Credits never expire (consumer-friendly, avoids EU unfair terms issues)
  // Refund policy: unused credits refundable within 30 days of purchase
}
```

#### Model B: Pay-Per-Consultation

```typescript
interface PayPerConsultation {
  model: 'pay_per_consultation';

  // User pays exact cost + platform margin
  margin_percentage: 30; // MedPanel takes 30% on top of API costs
  minimum_charge_usd: 1.00; // Minimum consultation charge
  maximum_charge_usd: 35.00; // Cap (complex + enhanced reliability)

  // Pre-authorization: hold estimated max before starting
  // Final charge: exact cost after completion
  // If final < pre-auth, release the difference
}
```

#### Model C: Subscription

```typescript
interface SubscriptionModel {
  model: 'subscription';

  tiers: [
    {
      name: 'Explorer',
      price_monthly_usd: 19.99,
      included_consultations: 5, // Per month
      included_budget_usd: 30, // Total API spend included
      overage_rate: 1.2, // $1.20 per $1.00 of API cost over included
      max_tier: 'moderate', // Cannot run complex without upgrading
    },
    {
      name: 'Professional',
      price_monthly_usd: 49.99,
      included_consultations: 15,
      included_budget_usd: 120,
      overage_rate: 1.1,
      max_tier: 'complex',
      enhanced_reliability: true, // Included at no extra charge
    },
    {
      name: 'Unlimited',
      price_monthly_usd: 99.99,
      included_consultations: -1, // Unlimited
      included_budget_usd: 500, // Fair use cap
      overage_rate: 1.0, // At cost
      max_tier: 'complex',
      enhanced_reliability: true,
      priority_processing: true,
    },
  ];
}
```

### 6c. Free Tier

```typescript
interface FreeTier {
  // Available to all registered users, no payment method required
  consultations_per_month: 2;
  max_tier: 'simple'; // Simple consultations only
  max_budget_per_consultation_usd: 3.00;
  enhanced_reliability: false;
  features_limited: [
    'No Enhanced Reliability Mode',
    'Simple consultations only (1-2 specialists)',
    'Maximum 2 consultation rounds',
    'No cross-model verification',
  ];

  // Upgrade prompts
  upgrade_prompt_after_free_used: true;
  show_upgrade_in_results: true; // "Upgrade to unlock complex multi-specialist analysis"
}
```

### 6d. Stripe Database Schema

```sql
CREATE TABLE billing_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(50) UNIQUE,
  billing_model   VARCHAR(30) NOT NULL DEFAULT 'free', -- free, credits, pay_per, subscription
  credits_balance DECIMAL(10,2) DEFAULT 0,
  subscription_id VARCHAR(50),
  subscription_status VARCHAR(20), -- active, past_due, cancelled
  free_consultations_remaining INT DEFAULT 2,
  free_consultations_reset_at TIMESTAMPTZ, -- Monthly reset
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE billing_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  consultation_id   UUID REFERENCES consultations(id),
  type              VARCHAR(30) NOT NULL, -- credit_purchase, consultation_charge, subscription_renewal, refund
  amount_usd        DECIMAL(10,6) NOT NULL,
  credits_delta     DECIMAL(10,2), -- +10 for purchase, -8 for consultation
  stripe_payment_id VARCHAR(50),
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own billing"
  ON billing_accounts FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions"
  ON billing_transactions FOR SELECT USING (auth.uid() = user_id);
```

---

## 7. Cost Monitoring and Alerting

### 7a. Platform-Level Cost Monitoring

Beyond per-consultation tracking, monitor aggregate platform costs.

```typescript
interface PlatformCostMetrics {
  // Real-time
  total_spend_today_usd: number;
  total_spend_this_month_usd: number;
  active_consultations: number;

  // Averages
  avg_cost_per_consultation_usd: number;
  avg_cost_by_tier: Record<string, number>;
  avg_tokens_per_consultation: number;

  // Alerts
  daily_spend_limit_usd: number; // Alert if exceeded
  monthly_spend_limit_usd: number; // Hard stop if exceeded
}

// Alerting thresholds (platform operator alerts, not user-facing):
// - Daily spend > $500: warning
// - Daily spend > $1000: critical alert
// - Single consultation > $30: investigate (should be impossible under normal operation)
// - Average cost per consultation trending up > 10% week-over-week: investigate
// - Degradation rate > 20% of consultations: investigate (model costs may have increased)
```

### 7b. Cost Optimization Levers

| Lever | Savings | Trade-off |
|-------|---------|-----------|
| Anthropic prompt caching | 90% on cached input tokens | Requires stable system prompts |
| Batch API (non-interactive) | 50% on Anthropic calls | 24-hour latency (only for background tasks) |
| Sonnet-first with Opus escalation | ~60% per agent | Slightly less nuanced initial analysis |
| Shared evidence package caching | Avoid redundant Perplexity calls | Cache invalidation complexity |
| Token limit tuning | Reduce waste from over-allocation | Risk of truncated outputs |
| Model version monitoring | Newer models often cheaper | Migration and testing effort |
