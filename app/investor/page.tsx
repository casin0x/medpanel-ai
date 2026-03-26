"use client";

import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Clock,
  DollarSign,
  Target,
  Users,
  FileText,
  TrendingUp,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Zap,
  BookOpen,
} from "lucide-react";
import { Nav } from "@/components/nav";

/* ──────────────────────────────────────────────
   Data
   ────────────────────────────────────────────── */

const USE_OF_FUNDS = [
  { item: "Finish MVP + infrastructure", amount: "15-20K", pct: 12, desc: "Hosting, API costs (Claude, PubMed), domain, polish UI" },
  { item: "Provisional patent filing", amount: "3-5K", pct: 3, desc: "Cover multi-specialist cross-examination protocol IP for 12 months" },
  { item: "Growth hire (4-6 months)", amount: "30-45K", pct: 25, desc: "Targeted doctor outreach — Doximity, medical Twitter/X, r/medicine, podcasts" },
  { item: "Targeted SEM + content", amount: "20-30K", pct: 17, desc: "Google Ads on 'clinical decision support' keywords, medical SEO" },
  { item: "Medical conference (1-2)", amount: "10-15K", pct: 8, desc: "HLTH or HIMSS — demo booth, buyer meetings" },
  { item: "M&A advisory + broker", amount: "10-15K", pct: 8, desc: "Retainer to get in front of Doximity, Wolters Kluwer, Elsevier BD teams" },
  { item: "Legal (IP + sale)", amount: "10-15K", pct: 8, desc: "Patent counsel, asset purchase agreement, corporate structuring" },
  { item: "Reserve / runway buffer", amount: "15-25K", pct: 12, desc: "6 months of runway cushion for timeline slippage" },
];

const TIMELINE = [
  { month: "0-2", title: "Ship MVP", desc: "Wire real AI pipeline — specialist agents running live consultations with PubMed evidence. File provisional patent.", status: "building" },
  { month: "2-4", title: "Get 50+ Doctor Users", desc: "Targeted outreach, not ads. Medical Twitter/X, Doximity forums, podcast appearances. Collect testimonials.", status: "planned" },
  { month: "3-5", title: "Approach Buyers", desc: "Direct outreach to 5-10 strategic buyers. Demo walkthrough. Create competitive tension with parallel conversations.", status: "planned" },
  { month: "4-8", title: "Negotiate + Close", desc: "At $1-5M, this is a VP-level budget decision — not a board vote. Simple asset purchase agreement.", status: "planned" },
];

const BUYERS = [
  { name: "Doximity", why: "80% of US doctors on platform. Paid $63M for Pathway (clinical AI). $1-5M is pocket change.", mcap: "$8B" },
  { name: "Wolters Kluwer", why: "UpToDate is their #1 product. Multi-specialist AI is a defensive play against OpenEvidence.", mcap: "$40B" },
  { name: "Elsevier", why: "ClinicalKey AI expanding. 300+ hospitals to cross-sell. Need multi-specialist differentiation.", mcap: "$40B+" },
  { name: "OpenEvidence", why: "Cross-examination protocol is the one feature they don't have. $700M raised, $12B valuation.", mcap: "$12B" },
  { name: "Kry / Livi", why: "Largest Nordic telehealth. 25% of Sweden registered. AI CDS adds to their platform.", mcap: "$2B+" },
  { name: "Ada Health", why: "Multi-specialist adds depth beyond symptom checking. $241M raised.", mcap: "$1.2B" },
];

const RISKS = [
  { risk: "No buyer at target price", likelihood: "Low (25%)", mitigation: "Multiple parallel conversations. IP is real, market is hot, price is cheap for these companies." },
  { risk: "Takes longer than planned", likelihood: "Medium (40%)", mitigation: "Reserve fund covers 6 extra months. Corporate BD is slow — budgeted for it." },
  { risk: "Buyer lowballs below $1M", likelihood: "Medium (30%)", mitigation: "Walk-away power. 2+ conversations create leverage. Patent pending adds floor." },
  { risk: "MVP doesn't resonate with doctors", likelihood: "Low (20%)", mitigation: "Already validated with real consultation data. Demo is live at medpanel.ai." },
];

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

export default function InvestorPage() {
  return (
    <div className="relative min-h-screen">
      <div className="bg-grid-pattern pointer-events-none fixed inset-0 opacity-[0.15]" />
      <Nav />

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6">

        {/* ─── HEADER ─── */}
        <section className="mb-12">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-emerald-400">
            Investment Memo — Confidential
          </p>
          <h1 className="mb-3 text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
            MedPanel AI — Feature Acquisition Play
          </h1>
          <p className="mb-6 max-w-xl text-base leading-relaxed text-slate-400">
            Raise SEK 1-2M (~$100-200K). Build the product. Sell the IP to a strategic
            buyer within 6-12 months. Clean exit at $1-5M.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Raise", value: "$100-200K" },
              { label: "Timeline", value: "6-12 mo" },
              { label: "Target Exit", value: "$1-5M" },
              { label: "Investor ROI", value: "3-10x" },
            ].map((s) => (
              <div key={s.label} className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/80 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className="font-mono text-lg font-semibold text-slate-100">{s.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── WHAT WE'VE BUILT ─── */}
        <section className="mb-10">
          <SectionTitle icon={<Zap size={16} />} title="What Already Exists" />
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            This isn&rsquo;t a pitch deck for a concept. The core product is built and
            demonstrable. What remains is wiring the live AI pipeline and getting it in
            front of doctors.
          </p>
          <div className="space-y-1.5">
            {[
              "Multi-specialist cross-examination protocol — 2,299 lines of specification (core IP)",
              "6 specialist agent prompts (cardiologist, nephrologist, endocrinologist, neuropsychiatrist, functional medicine, pharmacologist)",
              "Moderator + classifier agents for question routing and synthesis",
              "FHIR-aligned JSON schemas with shared definitions (single source of truth)",
              "Production Next.js web app — landing page, consultation input, results page, engine walkthrough",
              "Dual-mode UI — patient view (plain language) and clinician view (clinical language)",
              "Supabase database with 11 tables, 30 enums, 34 RLS policies, GDPR Article 9 architecture",
              "PubMed API integration for real-time evidence retrieval",
              "Live demo deployed on Vercel",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={13} className="mt-[3px] shrink-0 text-emerald-500/70" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href="/consult/demo"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--mp-radius)] border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 transition-colors duration-200 hover:bg-emerald-500/20"
            >
              View Live Demo <ArrowRight size={12} />
            </Link>
            <Link
              href="/engine"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--mp-radius)] border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition-colors duration-200 hover:border-slate-600"
            >
              See How It Works <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        {/* ─── THE THESIS ─── */}
        <section className="mb-10">
          <SectionTitle icon={<Target size={16} />} title="The Thesis" />
          <div className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/80 p-4">
            <p className="mb-3 text-sm leading-relaxed text-slate-300">
              Every major medical publisher and health tech platform is racing to add AI
              clinical decision support. The market is $2.5-6B today, growing 10%+ annually.
              OpenEvidence hit $100M+ ARR in under 12 months and is valued at $12B.
            </p>
            <p className="mb-3 text-sm leading-relaxed text-slate-300">
              <strong className="text-slate-100">None of them do multi-specialist cross-examination.</strong>{" "}
              They all give a single AI answer. MedPanel simulates how medicine actually works —
              specialists analyze independently, then challenge each other. Disagreements are
              surfaced, not hidden.
            </p>
            <p className="text-sm leading-relaxed text-slate-300">
              For a company like Wolters Kluwer ($40B market cap), Doximity ($8B), or Elsevier ($40B+),
              buying this IP for $1-5M is cheaper and faster than building it themselves. It&rsquo;s a
              feature acquisition — a VP-level budget decision, not a board vote.
            </p>
          </div>
        </section>

        {/* ─── MARKET CONTEXT ─── */}
        <section className="mb-10">
          <SectionTitle icon={<Globe size={16} />} title="Market Context (Facts)" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Clinical Decision Support market (2025)", value: "$2.5-6.4B", sub: "CAGR 9.6-11.0% to 2030" },
              { label: "AI in Healthcare market (2025)", value: "$15-37B", sub: "CAGR 36-39% to 2030" },
              { label: "OpenEvidence (closest comp)", value: "$12B valuation", sub: "$100M+ ARR in <12 months" },
              { label: "UpToDate individual seat", value: "$499-559/yr", sub: "350+ health systems globally" },
              { label: "Health AI VC funding (2025)", value: "$10.7B", sub: "62% of all digital health funding" },
              { label: "Health AI M&A deals (2025)", value: "195 deals", sub: "Up from 121 in 2024" },
            ].map((m) => (
              <div key={m.label} className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/60 px-3 py-2.5">
                <p className="text-[10px] text-slate-500">{m.label}</p>
                <p className="font-mono text-sm font-semibold text-slate-100">{m.value}</p>
                <p className="text-[10px] text-slate-500">{m.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-600">
            Sources: MarketsandMarkets, Grand View Research, CNBC, TechCrunch, Rock Health, Fierce Healthcare, Bessemer
          </p>
        </section>

        {/* ─── USE OF FUNDS ─── */}
        <section className="mb-10">
          <SectionTitle icon={<DollarSign size={16} />} title="Use of Funds ($100-200K)" />
          <div className="space-y-2">
            {USE_OF_FUNDS.map((f) => (
              <div key={f.item} className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/60 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">{f.item}</span>
                  <span className="font-mono text-sm text-emerald-400">${f.amount}</span>
                </div>
                <p className="text-xs text-slate-500">{f.desc}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500/40" style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-[var(--mp-radius)] border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2">
            <p className="text-xs text-emerald-400">
              Key principle: no agency spend. Targeted outreach to doctors, not paid volume.
              10 doctors who say &ldquo;I use this weekly&rdquo; is worth more than 10,000 sign-ups with 2% retention.
            </p>
          </div>
        </section>

        {/* ─── TIMELINE ─── */}
        <section className="mb-10">
          <SectionTitle icon={<Clock size={16} />} title="Timeline to Exit" />
          <div className="space-y-0">
            {TIMELINE.map((t, i) => (
              <div key={t.month} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-gray-900 text-[10px] font-bold text-emerald-400">
                    M{t.month}
                  </div>
                  {i < TIMELINE.length - 1 && <div className="w-px flex-1 bg-slate-800" />}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-medium text-slate-200">{t.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── STRATEGIC BUYERS ─── */}
        <section className="mb-10">
          <SectionTitle icon={<Building2 size={16} />} title="Target Buyers" />
          <p className="mb-3 text-sm text-slate-400">
            At $1-5M, these companies buy features and IP — not companies. This is a product budget decision.
          </p>
          <div className="space-y-2">
            {BUYERS.map((b) => (
              <div key={b.name} className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/60 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">{b.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">Mkt cap {b.mcap}</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-400">{b.why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── RETURN SCENARIOS ─── */}
        <section className="mb-10">
          <SectionTitle icon={<TrendingUp size={16} />} title="Return Scenarios" />
          <p className="mb-3 text-sm text-slate-400">
            Based on $150K investment (midpoint). Investor gets preferred return before founder split.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-4">Scenario</th>
                  <th className="pb-2 pr-4">Sale Price</th>
                  <th className="pb-2 pr-4">Investor Return</th>
                  <th className="pb-2">Multiple</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  { scenario: "Conservative", price: "$1M", ret: "$300-400K", mult: "2-2.7x" },
                  { scenario: "Base case", price: "$2-3M", ret: "$600K-$1M", mult: "4-6.7x" },
                  { scenario: "Upside", price: "$5M", ret: "$1.5-2M", mult: "10-13x" },
                  { scenario: "Downside", price: "No sale", ret: "IP + product retained", mult: "—" },
                ].map((r) => (
                  <tr key={r.scenario} className="border-b border-slate-800/50">
                    <td className="py-2.5 pr-4 font-medium">{r.scenario}</td>
                    <td className="py-2.5 pr-4 font-mono text-emerald-400">{r.price}</td>
                    <td className="py-2.5 pr-4">{r.ret}</td>
                    <td className="py-2.5 font-mono">{r.mult}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Downside protection: if no sale occurs, investor retains pro-rata equity in the
            company and the product continues generating value. The IP doesn&rsquo;t expire.
          </p>
        </section>

        {/* ─── COMPANY STRUCTURE ─── */}
        <section className="mb-10">
          <SectionTitle icon={<FileText size={16} />} title="Company Structure" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--mp-radius)] border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">Recommended</p>
              <h3 className="mb-2 text-sm font-semibold text-slate-100">Swedish AB</h3>
              <ul className="space-y-1 text-xs text-slate-400">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="mt-[2px] shrink-0 text-emerald-500/70" />
                  25,000 SEK minimum share capital
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="mt-[2px] shrink-0 text-emerald-500/70" />
                  20.6% corporate tax rate
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="mt-[2px] shrink-0 text-emerald-500/70" />
                  Founder is Swedish — simplest legal path
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="mt-[2px] shrink-0 text-emerald-500/70" />
                  3:12 rules — tax-efficient dividends for founders
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="mt-[2px] shrink-0 text-emerald-500/70" />
                  EU data residency (GDPR advantage for health data)
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="mt-[2px] shrink-0 text-emerald-500/70" />
                  Asset purchase by US buyer works fine across jurisdictions
                </li>
              </ul>
            </div>
            <div className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/60 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Alternative</p>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">US Delaware C-Corp (via Firstbase)</h3>
              <ul className="space-y-1 text-xs text-slate-400">
                <li className="flex items-start gap-1.5">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                  Standard for US VC / acquisition targets
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                  $500/yr + registered agent via Firstbase
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                  Cleaner if buyer is US-based and wants stock acquisition
                </li>
                <li className="flex items-start gap-1.5">
                  <AlertTriangle size={11} className="mt-[2px] shrink-0 text-amber-500/70" />
                  Adds tax complexity for Swedish founder (CFC rules)
                </li>
                <li className="flex items-start gap-1.5">
                  <AlertTriangle size={11} className="mt-[2px] shrink-0 text-amber-500/70" />
                  Dual-country compliance overhead
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                  Can convert AB → C-Corp later if needed for specific buyer
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            <strong className="text-slate-200">Recommendation:</strong> Start as Swedish AB. It&rsquo;s
            cheaper, simpler, and tax-efficient for the founder. An asset purchase (IP sale) works
            regardless of jurisdiction — Doximity or Wolters Kluwer can buy Swedish IP just as easily.
            Only incorporate in Delaware if a specific buyer requires it, which is rare for sub-$5M deals.
          </p>
        </section>

        {/* ─── RISKS ─── */}
        <section className="mb-10">
          <SectionTitle icon={<AlertTriangle size={16} />} title="Risks & Mitigations" />
          <div className="space-y-2">
            {RISKS.map((r) => (
              <div key={r.risk} className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/60 p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">{r.risk}</span>
                  <span className="rounded-[3px] bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                    {r.likelihood}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{r.mitigation}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── DEAL TERMS ─── */}
        <section className="mb-10">
          <SectionTitle icon={<Users size={16} />} title="Proposed Terms" />
          <div className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/80 p-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-slate-500">01</span>
                <div>
                  <p className="font-medium text-slate-200">Investment: SEK 1-2M (~$100-200K)</p>
                  <p className="text-xs text-slate-400">Convertible note or SAFE with 1.5-2x liquidation preference</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-slate-500">02</span>
                <div>
                  <p className="font-medium text-slate-200">Investor equity: 15-25%</p>
                  <p className="text-xs text-slate-400">Negotiable based on amount invested. Pro-rata rights on any future raise.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-slate-500">03</span>
                <div>
                  <p className="font-medium text-slate-200">Liquidation preference: 1.5-2x</p>
                  <p className="text-xs text-slate-400">Investor gets 1.5-2x their money back before any founder distribution. On a $2M sale with $150K invested at 2x, investor gets $300K first, remaining $1.7M split by equity.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-slate-500">04</span>
                <div>
                  <p className="font-medium text-slate-200">Target exit: 6-12 months</p>
                  <p className="text-xs text-slate-400">Asset sale (IP + codebase + patent) to strategic buyer. Clean, fast, no earn-out complexity.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-slate-500">05</span>
                <div>
                  <p className="font-medium text-slate-200">If no sale by month 18</p>
                  <p className="text-xs text-slate-400">Company continues operating. Investor retains equity. Product has intrinsic value — pivot to SaaS subscription if quick flip doesn&rsquo;t materialize.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── WHY NOW ─── */}
        <section className="mb-10">
          <SectionTitle icon={<BookOpen size={16} />} title="Why This Works Now" />
          <div className="space-y-2">
            {[
              { point: "Health AI valuations are at all-time highs", detail: "OpenEvidence went from $0 to $12B in under 4 years. Buyers are actively acquiring." },
              { point: "195 health AI M&A deals in 2025", detail: "Up 61% from 2024. The acquisition market is liquid and active." },
              { point: "Multi-specialist is a genuine gap", detail: "Every competitor gives one AI answer. Nobody simulates a real case conference with disagreements." },
              { point: "Product is 80% built", detail: "The IP exists. The demo is live. This isn't a 'give me money to start building' pitch." },
              { point: "Regulatory timing is favorable", detail: "FDA (Jan 2026) and EU (MDCG June 2025) both clarified that educational AI tools avoid device classification." },
            ].map((w) => (
              <div key={w.point} className="flex items-start gap-2">
                <CheckCircle2 size={13} className="mt-[3px] shrink-0 text-emerald-500/70" />
                <div>
                  <p className="text-sm font-medium text-slate-200">{w.point}</p>
                  <p className="text-xs text-slate-400">{w.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="mb-10 text-center">
          <div className="rounded-[var(--mp-radius)] border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
            <h2 className="mb-2 text-lg font-bold text-slate-100">Interested?</h2>
            <p className="mx-auto mb-4 max-w-sm text-sm text-slate-400">
              See the live demo, review the protocol, and let&rsquo;s talk.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/consult/demo"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--mp-radius)] bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500 sm:w-auto"
              >
                View Live Demo
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/engine"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--mp-radius)] border border-slate-700 px-6 py-3 text-sm font-medium text-slate-300 transition-colors duration-200 hover:border-slate-600 hover:text-slate-100 sm:w-auto"
              >
                Watch Engine Demo
              </Link>
            </div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-slate-800/50 px-4 py-6">
          <div className="text-center">
            <p className="text-xs text-slate-600">
              This document is for informational purposes only and does not constitute an offer
              to sell securities. Investment involves risk including loss of principal.
            </p>
            <p className="mt-2 text-[10px] text-slate-700">
              MedPanel AI &middot; March 2026 &middot; Confidential
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Components
   ────────────────────────────────────────────── */

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-emerald-400">{icon}</span>
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
    </div>
  );
}
