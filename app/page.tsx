import Link from "next/link";
import { Nav } from "@/components/nav";
import {
  ArrowRight,
  Shield,
  CheckCircle2,
  Heart,
  Beaker,
  Brain,
  Pill,
  Activity,
  Microscope,
  Users,
  FileSearch,
  Quote,
  X,
} from "lucide-react";

const SPECIALISTS = [
  {
    name: "Cardiologist",
    concern: "Atherogenic dyslipidemia",
    finding:
      "LDL 151 with HDL 36 at age 30 on TRT creates a concerning lifetime cardiovascular risk trajectory. ApoB and Lp(a) testing would reveal the true atherogenic particle burden — the 10-year risk calculator underestimates at this age.",
    color: "border-l-pink-500/60",
    badge: "bg-pink-500/10 text-pink-400 border-pink-500/30",
    dot: "bg-pink-500",
    Icon: Heart,
  },
  {
    name: "Nephrologist",
    concern: "Kidney trajectory unknown",
    finding:
      "Cystatin C eGFR of 88 at age 30 is 25-30% below expected baseline. Most likely from ketamine nephrotoxicity. One measurement can't show if it's stable or declining — serial monitoring is critical before any supplement decisions.",
    color: "border-l-violet-500/60",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    dot: "bg-violet-500",
    Icon: Beaker,
  },
  {
    name: "Functional Medicine",
    concern: "Inflammation is upstream",
    finding:
      "CRP 5.8 may be driving the mitochondrial OAT findings via oxidative stress. The cis-aconitic acid elevation could resolve by addressing inflammation rather than adding more mitochondrial supplements — treat the fire, not the smoke.",
    color: "border-l-teal-500/60",
    badge: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    dot: "bg-teal-500",
    Icon: Microscope,
  },
  {
    name: "Neuropsychiatrist",
    concern: "Diagnostic reframe",
    finding:
      "What was labeled OCD is actually Complex PTSD — arousal-contingent, social-specific, rooted in real trauma. This changes the treatment pathway entirely: EMDR + guanfacine, not glutamate modulators or SSRIs.",
    color: "border-l-orange-500/60",
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    dot: "bg-orange-500",
    Icon: Brain,
  },
  {
    name: "Endocrinologist",
    concern: "Over-replaced on TRT",
    finding:
      "At SHBG 17, 75mg/week produces free testosterone ~250-280 pg/mL — above the upper limit. The correct direction is dose reduction, not increase. Estradiol has never been tested despite being a standard TRT monitoring parameter.",
    color: "border-l-cyan-500/60",
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    dot: "bg-cyan-500",
    Icon: Activity,
  },
  {
    name: "Pharmacologist",
    concern: "Stack interactions clear",
    finding:
      "Full 18-supplement stack screened against TRT and beta-blockers. No critical interactions at current doses. Flagged vitamin D + reduced GFR calcium risk and the oxalate load from vitamin C + collagen combination.",
    color: "border-l-purple-500/60",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    dot: "bg-purple-500",
    Icon: Pill,
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <div className="bg-grid-pattern pointer-events-none fixed inset-0 opacity-[0.15]" />
      <Nav />

      <main className="relative z-10">
        {/* ─── HERO ─── */}
        <section className="mx-auto max-w-3xl px-6 pb-10 pt-20 text-center sm:pt-28">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-50 sm:text-[2.75rem] sm:leading-[1.15]">
            A second opinion panel
            <br />
            <span className="text-emerald-400">
              for every clinical question
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-slate-400">
            AI specialists research, cross-examine, and surface what to discuss
            with your patient — grounded in PubMed evidence.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/consult"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--mp-radius)] bg-emerald-600 px-7 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
            >
              Start a Consultation
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/consult/demo"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--mp-radius)] border border-slate-700 px-7 py-3 text-sm font-medium text-slate-300 transition-colors duration-200 hover:border-slate-600 hover:text-slate-100"
            >
              View Demo Results
            </Link>
          </div>
        </section>

        {/* ─── PRODUCT PREVIEW (full-width breakout) ─── */}
        <section className="px-4 pb-8 pt-4 sm:px-8">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-slate-700/50 shadow-2xl shadow-emerald-500/[0.03]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-slate-800/80 bg-[#0d1117] px-4 py-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="mx-auto flex h-6 w-56 items-center justify-center rounded bg-slate-800/80 text-[10px] text-slate-500 sm:w-72">
                medpanel.ai/consult/results
              </div>
            </div>

            {/* Content — two-column on desktop */}
            <div className="grid bg-[#0d1117] md:grid-cols-[1fr_280px]">
              {/* Left: main results */}
              <div className="space-y-3 border-r border-slate-800/50 p-4 sm:p-5">
                {/* Question */}
                <div>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                    Consultation
                  </p>
                  <p className="text-sm font-medium text-slate-200">
                    &ldquo;My eGFR dropped from 68 to 61 in 6 months. Is berberine safe for my kidneys?&rdquo;
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Cardiologist", "Nephrologist", "Functional Medicine"].map(
                      (s) => {
                        const spec = SPECIALISTS.find((sp) => sp.name === s);
                        return (
                          <span
                            key={s}
                            className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[9px] font-medium ${spec?.badge}`}
                          >
                            <span
                              className={`h-1 w-1 rounded-full ${spec?.dot}`}
                            />
                            {s}
                          </span>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Safety */}
                <div className="rounded-[var(--mp-radius)] border border-orange-500/15 bg-orange-500/[0.04] px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-medium text-orange-400">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500/20 text-[7px] font-bold">
                      3
                    </span>
                    Safety Flags
                    <span className="ml-1 font-normal text-slate-500">
                      eGFR decline · Berberine renal risk · Metformin dose review
                    </span>
                  </p>
                </div>

                {/* Consensus */}
                <div className="space-y-1">
                  {[
                    "Berberine not recommended with eGFR <60 and active decline (3/3)",
                    "SGLT2 inhibitor preferred — dual glucose + renal protection",
                    "Serial cystatin C q3 months to track kidney trajectory",
                    "CRP investigation before any supplement additions",
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-[11px]"
                    >
                      <CheckCircle2
                        size={11}
                        className="mt-[3px] shrink-0 text-emerald-500/80"
                      />
                      <span className="text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Specialist Debate (the money section) */}
                <div>
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                    Panel Disagreement
                  </p>
                  <p className="mb-2 text-[10px] text-slate-400">
                    <span className="font-medium text-amber-400/90">
                      &ldquo;What should come first?&rdquo;
                    </span>
                    {" "}— each specialist advocates a different priority:
                  </p>

                  {[
                    {
                      name: "Cardiologist",
                      badge: "bg-pink-500/10 text-pink-400 border-pink-500/30",
                      borderColor: "border-l-pink-500/60",
                      headline: "argues against berberine — cardiac risk profile needs stabilizing first",
                      detail: "With active eGFR decline and uncontrolled HbA1c, adding an unregulated supplement is premature. SGLT2 inhibitors have proven cardiorenal benefit — use evidence-based therapy.",
                    },
                    {
                      name: "Nephrologist",
                      badge: "bg-violet-500/10 text-violet-400 border-violet-500/30",
                      borderColor: "border-l-violet-500/60",
                      headline: "argues berberine is contraindicated at this GFR trajectory",
                      detail: "eGFR 68→61 in 6 months is a -14 mL/min/year slope. Berberine has limited renal safety data below 60. Prioritize trajectory stabilization.",
                    },
                    {
                      name: "Functional Medicine",
                      badge: "bg-teal-500/10 text-teal-400 border-teal-500/30",
                      borderColor: "border-l-teal-500/60",
                      headline: "argues for addressing insulin resistance root cause before any additions",
                      detail: "Berberine targets the same AMPK pathway as metformin. Redundant mechanism. Address inflammatory drivers of the GFR decline instead.",
                    },
                  ].map((spec, i) => (
                    <div
                      key={spec.name}
                      className={`mb-1.5 rounded-[var(--mp-radius)] border border-slate-800/60 border-l-2 ${spec.borderColor} bg-slate-800/20 p-2.5`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-[3px] border px-1.5 py-0.5 text-[8px] font-medium ${spec.badge}`}>
                            {spec.name}
                          </span>
                          <span className="text-[11px] text-slate-300">
                            <span className="font-medium">{spec.headline}</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600">
                          {i === 0 ? "▾" : "▸"}
                        </span>
                      </div>
                      {i === 0 && (
                        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                          {spec.detail}
                        </p>
                      )}
                    </div>
                  ))}
                  <p className="mt-1 text-[9px] italic text-slate-600">
                    All three agree these are complementary, not contradictory — your doctor can address all simultaneously.
                  </p>
                </div>

                {/* Questions for doctor */}
                <div className="rounded-[var(--mp-radius)] border border-emerald-500/15 bg-emerald-500/[0.04] p-3">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-emerald-500">
                    Questions for Your Doctor
                  </p>
                  <div className="space-y-0.5 text-[11px] leading-relaxed text-slate-300">
                    <p>1. Should we switch to dapagliflozin for dual kidney-glucose benefit?</p>
                    <p>2. Can we track eGFR trajectory with cystatin C every 3 months?</p>
                    <p>3. What is causing the rapid eGFR decline — is it diabetes or something else?</p>
                    <p className="text-slate-600">+ 4 more questions...</p>
                  </div>
                </div>
              </div>

              {/* Right: evidence sidebar (desktop only) */}
              <div className="hidden p-4 md:block">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
                  Evidence Landscape
                </p>
                <div className="space-y-2">
                  {[
                    {
                      tier: "Strong",
                      color: "text-emerald-400 bg-emerald-500/10",
                      items: [
                        "SGLT2i renal protection (DAPA-CKD)",
                        "Metformin safe to eGFR 30 (KDIGO)",
                      ],
                    },
                    {
                      tier: "Moderate",
                      color: "text-blue-400 bg-blue-500/10",
                      items: [
                        "Berberine AMPK activation in T2D",
                        "eGFR slope predicts CKD outcomes",
                      ],
                    },
                    {
                      tier: "Preliminary",
                      color: "text-amber-400 bg-amber-500/10",
                      items: [
                        "Berberine renal safety in CKD 3",
                        "Combination berberine + metformin",
                      ],
                    },
                  ].map((section) => (
                    <div key={section.tier}>
                      <span
                        className={`inline-block rounded-[3px] px-1.5 py-0.5 text-[8px] font-semibold ${section.color}`}
                      >
                        {section.tier}
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {section.items.map((item, i) => (
                          <li
                            key={i}
                            className="text-[10px] leading-snug text-slate-500"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pull quote */}
          <div className="mx-auto mt-8 max-w-xl text-center">
            <Quote size={14} className="mx-auto mb-2 text-slate-700" />
            <p className="text-sm italic leading-relaxed text-slate-400">
              &ldquo;All three specialists independently agreed: berberine is
              not recommended with active eGFR decline. An SGLT2 inhibitor
              offers proven dual benefit for blood sugar and kidney
              protection.&rdquo;
            </p>
            <p className="mt-1.5 text-[11px] text-slate-600">
              Panel consensus from a real MedPanel consultation
            </p>
          </div>
        </section>

        {/* ─── ENGINE VISUALIZATION (compact) ─── */}
        <section className="mx-auto max-w-3xl px-6 pb-20 pt-8">
          <div className="mb-6 text-center">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Under the Hood</p>
            <h2 className="mb-2 text-xl font-bold text-slate-100">Not one AI — a structured panel</h2>
            <p className="text-sm text-slate-400">Each consultation follows a clinical case conference protocol</p>
          </div>

          <div className="space-y-0">
            {[
              {
                step: "1",
                title: "Classify & Route",
                desc: "AI classifier detects the medical domains, urgency, and complexity — then selects the right specialists.",
                detail: "nephrology + cardiology + metabolic → 3 specialists",
                color: "text-blue-400",
              },
              {
                step: "2",
                title: "Evidence Retrieval",
                desc: "PubMed is searched for relevant studies. Each citation is verified with a real PMID.",
                detail: "4 studies retrieved · 3 guidelines referenced",
                color: "text-blue-400",
              },
              {
                step: "3",
                title: "Independent Analysis",
                desc: "Each specialist analyzes the case from their domain without seeing others' work.",
                detail: "3 parallel analyses · evidence-grounded",
                color: "text-emerald-400",
              },
              {
                step: "4",
                title: "Cross-Examination",
                desc: "Specialists review each other's findings. They challenge, agree, disagree — with evidence.",
                detail: "2 disagreements identified · 1 resolved",
                color: "text-amber-400",
              },
              {
                step: "5",
                title: "Consensus & Output",
                desc: "A moderator synthesizes the panel into structured output: consensus, disagreements, questions, evidence.",
                detail: "3 consensus items · 7 questions for doctor",
                color: "text-emerald-400",
              },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-4">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-gray-900 text-[10px] font-bold ${item.color}`}>
                    {item.step}
                  </div>
                  {i < 4 && <div className="w-px flex-1 bg-slate-800" />}
                </div>
                {/* Content */}
                <div className="pb-6">
                  <p className="text-sm font-medium text-slate-200">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-600">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-center">
            <Link
              href="/engine"
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-emerald-400 transition-colors duration-200 hover:text-emerald-300"
            >
              Watch a live demo of this process
              <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        {/* ─── SPECIALIST GRID ─── */}
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-12">
          <h2 className="mb-1.5 text-center text-xl font-bold text-slate-100">
            Your virtual panel
          </h2>
          <p className="mb-8 text-center text-sm text-slate-500">
            Each specialist analyzes independently, then cross-examines the
            others
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {SPECIALISTS.map((spec) => (
              <div
                key={spec.name}
                className={`rounded-[var(--mp-radius)] border border-slate-800/80 border-l-2 ${spec.color} bg-gray-900/80 p-4 transition-colors duration-200 hover:bg-gray-800/60`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <spec.Icon size={13} className="shrink-0 text-slate-500" />
                  <span className="text-[13px] font-semibold text-slate-200">
                    {spec.name}
                  </span>
                </div>
                <p className="mb-2 text-[11px] font-medium text-slate-400">
                  {spec.concern}
                </p>
                <p className="text-xs leading-relaxed text-slate-500">
                  {spec.finding}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── COMPARISON ─── */}
        <section className="mx-auto max-w-2xl px-6 pb-20">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users size={13} className="text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-500">
                  Single AI Chat
                </h3>
              </div>
              <ul className="space-y-2 text-[13px] text-slate-500">
                {[
                  "One perspective, one model",
                  "Generic advice for anyone",
                  "No citations or evidence tiers",
                  '"You should take X..."',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <X size={11} className="shrink-0 text-slate-700" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[var(--mp-radius)] border border-emerald-500/25 bg-emerald-500/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileSearch size={13} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400">
                  MedPanel
                </h3>
              </div>
              <ul className="space-y-2 text-[13px] text-slate-300">
                {[
                  "3-5 specialists, cross-examined",
                  "Grounded in YOUR labs and profile",
                  "PubMed citations with PMID links",
                  '"Questions to ask your doctor..."',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2
                      size={11}
                      className="shrink-0 text-emerald-500"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─── WHAT IT IS / IS NOT ─── */}
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/60 p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <Shield size={14} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400">
                  What MedPanel Is
                </h3>
              </div>
              <ul className="space-y-1.5 text-[13px] text-slate-400">
                {[
                  "An exploration tool for health questions",
                  "Multiple specialist perspectives on your profile",
                  "Evidence-grounded with PubMed citations",
                  "\u201CQuestions to ask your doctor\u201D as primary output",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900/60 p-4">
              <div className="mb-2.5 flex items-center gap-2">
                <Shield size={14} className="text-red-400" />
                <h3 className="text-sm font-semibold text-red-400">
                  What MedPanel Is Not
                </h3>
              </div>
              <ul className="space-y-1.5 text-[13px] text-slate-400">
                {[
                  "Not medical advice, diagnosis, or treatment",
                  "Not a replacement for your doctor",
                  "Not a symptom checker or diagnostic tool",
                  "Not a medical device",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-red-500/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="mx-auto max-w-2xl px-6 pb-20 text-center">
          <h2 className="mb-2 text-xl font-bold text-slate-100">
            Ready to explore?
          </h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-slate-400">
            Ask any health question. Get structured, evidence-grounded
            perspectives.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/consult"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--mp-radius)] bg-emerald-600 px-7 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
            >
              Start a Consultation
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/consult/demo"
              className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--mp-radius)] border border-slate-700 px-7 py-3 text-sm font-medium text-slate-300 transition-colors duration-200 hover:border-slate-600 hover:text-slate-100"
            >
              View Demo Results
            </Link>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-slate-800/50 px-6 py-8">
          <div className="mx-auto flex max-w-2xl items-start gap-2.5 justify-center">
            <Shield size={12} className="mt-0.5 shrink-0 text-slate-600" />
            <p className="text-center text-sm leading-relaxed text-slate-500">
              MedPanel AI is an educational exploration tool. It does not provide
              medical advice, diagnosis, or treatment. Always consult a qualified
              healthcare professional. Built with evidence from PubMed, Cochrane
              Library, and clinical guidelines.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
