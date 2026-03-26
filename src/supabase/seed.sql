-- ============================================================================
-- MedPanel AI: Seed Data
--
-- Budget tier pricing and reference/lookup data.
-- Run after migrations: supabase db reset (applies migrations then seed).
--
-- Pricing rationale:
--   - Simple: 1-2 specialists, 1 round, Haiku/Sonnet only → $5 / 50K tokens
--   - Moderate: 3-4 specialists, 2 rounds, mixed tiers → $15 / 150K tokens
--   - Complex: 5 specialists, 3 rounds, Opus-heavy → $25 / 300K tokens
--
-- Complexity ranges map to QUESTION-CLASSIFICATION.md scoring:
--   - Simple: 0.0-2.5 (single domain, routine, well-studied)
--   - Moderate: 2.6-6.5 (multi-domain, some interactions, mixed evidence)
--   - Complex: 6.6-10.0 (multi-domain, drug interactions, sparse evidence)
-- ============================================================================

-- Budget tier pricing
INSERT INTO budget_tier_pricing (tier, complexity_range, max_cost_usd, max_total_tokens, description) VALUES
  (
    'simple',
    '0.0-2.5',
    5.00,
    50000,
    'Single domain, routine questions. 1-2 specialists (Haiku/Sonnet), 1 round. Example: "What does my TSH of 2.5 mean?"'
  ),
  (
    'moderate',
    '2.6-6.5',
    15.00,
    150000,
    'Multi-domain or medication interactions. 3-4 specialists, up to 2 rounds with mixed model tiers. Example: "I''m on metformin and my A1C is 6.8 — should I add a GLP-1?"'
  ),
  (
    'complex',
    '6.6-10.0',
    25.00,
    300000,
    'Multi-domain with drug interactions, sparse evidence, or optimization stacks. 5 specialists, up to 3 rounds, Opus-heavy. Example: "Full protocol review: TRT + thyroid + 12 supplements + psychiatric meds."'
  )
ON CONFLICT (tier) DO UPDATE SET
  complexity_range = EXCLUDED.complexity_range,
  max_cost_usd = EXCLUDED.max_cost_usd,
  max_total_tokens = EXCLUDED.max_total_tokens,
  description = EXCLUDED.description,
  updated_at = now();
