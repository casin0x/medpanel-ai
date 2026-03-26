"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  BookOpen,
  Stethoscope,
  CircleCheckBig,
  CircleAlert,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { ModeToggle, type ViewMode } from "@/components/mode-toggle";
import { SpecialistBadge } from "@/components/specialist-badge";
import { EvidenceBadge } from "@/components/evidence-badge";
import { SafetyFlag } from "@/components/safety-flag";
import { ConsensusItem } from "@/components/consensus-item";
import { QuestionCard } from "@/components/question-card";

/* ===========================================================
   HARDCODED DEMO DATA — CoQ10 200mg Consultation (Founder Case)
   This proves the UI works before wiring the real pipeline.
   =========================================================== */

const DEMO = {
  question:
    "Should I take CoQ10 at 200mg daily for my mitochondrial issues? My OAT shows cis-aconitic acid at 65 (range 10-36). I'm on TRT and have kidney concerns.",
  specialists: [
    "cardiologist",
    "nephrologist",
    "functional_medicine",
  ] as string[],
  safetyFlags: [
    {
      severity: "high",
      title: "Atherogenic dyslipidemia pattern",
      description:
        "LDL 151 mg/dL with HDL 36 mg/dL and hs-CRP 5.8 mg/L creates a high-risk cardiovascular triad. The LDL/HDL ratio of 4.2 exceeds the target of <3.0. Combined with TRT, this warrants active lipid management.",
      action:
        "Request advanced lipid panel including ApoB, Lp(a), and LDL particle number. Consider repeating hs-CRP to confirm it was not an acute-phase response.",
    },
    {
      severity: "moderate",
      title: "Elevated hs-CRP requires investigation",
      description:
        "hs-CRP of 5.8 mg/L is nearly 6x the upper reference limit. While dated from a worse lifestyle period (Sept 2024), it indicates significant systemic inflammation. Current levels are unknown.",
      action:
        "Retest hs-CRP to establish current baseline. If still elevated, investigate sources: periodontal disease, insulin resistance, visceral adiposity, chronic infection.",
    },
    {
      severity: "moderate",
      title: "Kidney function below threshold",
      description:
        "Creatinine 1.26 mg/dL (high) with eGFR 79 mL/min by CKD-EPI, WITHOUT creatine supplementation. Cystatin C-based eGFR was 88 mL/min, more accurate for muscular patients. History of ketamine use adds nephrotoxic risk.",
      action:
        "Track eGFR trajectory with cystatin C every 3-6 months. Request urine albumin-to-creatinine ratio (UACR) to check for proteinuria. Discuss previous ketamine use with your nephrologist.",
    },
    {
      severity: "low",
      title: "TRT estradiol never measured",
      description:
        "Estradiol has never been tested despite being on testosterone replacement. Previous SubQ injections into abdominal fat may have increased aromatization. Switched to IM March 2026.",
      action:
        "Test estradiol (sensitive assay) at next blood draw. If elevated, discuss aromatase inhibitor necessity with your endocrinologist.",
    },
  ],
  consensus: [
    {
      text: "CoQ10 at 200mg daily is safe for this patient profile. No contraindications with current medications including TRT, metoprolol, or propranolol.",
      specialists: [
        "cardiologist",
        "nephrologist",
        "functional_medicine",
      ],
      evidenceTier: "strong",
    },
    {
      text: "CoQ10 supplementation is reasonable but is NOT the highest priority intervention. The cardiovascular risk triad (LDL/HDL/CRP) and kidney function trajectory need urgent attention first.",
      specialists: [
        "cardiologist",
        "nephrologist",
        "functional_medicine",
      ],
      evidenceTier: "moderate",
    },
    {
      text: "The elevated cis-aconitic acid on OAT is consistent with mitochondrial stress, supporting the rationale for CoQ10. However, OAT alone should not drive dosing decisions.",
      specialists: [
        "cardiologist",
        "nephrologist",
        "functional_medicine",
      ],
      evidenceTier: "preliminary",
    },
    {
      text: "Ubiquinol form is preferred over ubiquinone for this patient due to better bioavailability, especially given potential mitochondrial dysfunction.",
      specialists: [
        "cardiologist",
        "nephrologist",
        "functional_medicine",
      ],
      evidenceTier: "moderate",
    },
  ],
  disagreements: [
    {
      topic: "What should be the immediate clinical priority?",
      positions: [
        {
          specialist: "cardiologist",
          position: "Advanced lipid characterization first",
          reasoning:
            "The LDL 151 / HDL 36 / CRP 5.8 triad represents the most immediate actionable risk. Get ApoB, Lp(a), and LDL particle number before optimizing supplements. If ApoB is elevated, lipid-lowering therapy may be warranted regardless of age.",
        },
        {
          specialist: "nephrologist",
          position: "GFR trajectory monitoring takes precedence",
          reasoning:
            "With eGFR at 79 (CKD-EPI) and a history of nephrotoxic substance use, establishing whether kidney function is stable, declining, or recovering is critical. Serial cystatin C measurements every 3 months will establish the trajectory. This determines whether supplements need dose adjustments.",
        },
        {
          specialist: "functional_medicine",
          position: "Identify the inflammation source",
          reasoning:
            "hs-CRP of 5.8 is the linchpin. It connects the cardiovascular risk AND potentially the mitochondrial stress. Address root-cause inflammation first — gut permeability (OAT dysbiosis markers support this), sleep timing, and autonomic nervous system regulation. The OAT results suggest a gut-mito connection worth investigating.",
        },
      ],
    },
    {
      topic: "Is the OAT-based mitochondrial assessment reliable?",
      positions: [
        {
          specialist: "cardiologist",
          position: "Treat with caution — OAT has limitations",
          reasoning:
            "Organic acid testing is not validated as a standalone diagnostic for mitochondrial dysfunction. Cis-aconitic acid elevations can reflect dehydration, dietary factors, or renal clearance changes. Would need corroborating evidence like muscle biopsy or genetic testing for a definitive mitochondrial diagnosis.",
        },
        {
          specialist: "functional_medicine",
          position: "OAT is clinically useful in context",
          reasoning:
            "While no single marker is definitive, the pattern matters: elevated cis-aconitic acid + suberic acid abnormality + clinical symptoms (fatigue, autonomic dysfunction) + benzo recovery all point to mitochondrial stress. This pattern, not any single marker, justifies targeted support.",
        },
      ],
    },
  ],
  questions: [
    {
      question:
        "Order ApoB, Lp(a), and LDL particle count to characterize the atherogenic burden beyond standard lipid panel.",
      whyAsk:
        "LDL-C of 151 with HDL 36 and TG 73 in a 30-year-old on TRT. Standard panel underestimates risk — ApoB provides direct particle count. Lp(a) is genetically fixed and independently doubles CV risk if elevated (INTERHEART data). One-time Lp(a) changes lifetime management strategy.",
      whatToListen:
        "If ApoB >90 mg/dL or Lp(a) >50 mg/dL, the threshold for pharmacotherapy shifts significantly. Consider pitavastatin 2mg over rosuvastatin given SHBG 17 and insulin sensitivity concerns. ACC/AHA lifetime risk framework applies — 10-year calculators underestimate at age 30.",
    },
    {
      question:
        "Repeat hs-CRP (x2 at 2-week interval) to confirm chronicity. If >2.0, investigate inflammatory source — GI, periodontal, metabolic, iatrogenic.",
      whyAsk:
        "Prior hs-CRP 5.8 mg/L (Sept 2024) during active substance use. Patient now 6 months sober with improved lifestyle. If CRP has normalized, residual inflammation concern drops. If persistent, suggests ongoing inflammatory process independent of lifestyle — gut dysbiosis (OAT supports), insulin resistance (low SHBG correlates), or TRT-related.",
      whatToListen:
        "Three specialists independently flagged CRP as the most interconnected finding. The functional medicine perspective — that inflammation may be upstream of the mitochondrial OAT abnormalities — warrants consideration if CRP remains elevated despite lifestyle optimization.",
    },
    {
      question:
        "Establish GFR trajectory with serial cystatin C (q3-6 months). Order baseline UACR. Consider renal ultrasound given ketamine exposure history.",
      whyAsk:
        "Cystatin C eGFR 88 at age 30 represents ~25-30% reduction from expected baseline. Creatinine-based eGFR (79) is unreliable — patient is muscular, on TRT, now taking creatine 2.5g. Single GFR snapshot cannot distinguish stable post-toxic plateau from progressive decline. UACR detects early glomerular damage that GFR misses.",
      whatToListen:
        "Trajectory is everything. If slope is flat over 6 months, prognosis is fundamentally different from a -3 mL/min/year decline. The ketamine nephrotoxicity literature supports interstitial nephritis and possible papillary necrosis — renal ultrasound assesses structural damage. KDIGO does not have specific post-ketamine guidelines; clinical consensus supports 12-24 month serial monitoring.",
    },
    {
      question:
        "Add sensitive estradiol (LC-MS/MS) and hematocrit to the TRT monitoring panel. Consider baseline echocardiogram given prior supraphysiologic exposure.",
      whyAsk:
        "Estradiol never tested on TRT with SHBG 17 — a standard monitoring omission per Endocrine Society guidelines. Patient previously on ~250mg/week (effective ~500mg at SHBG 17) and recently switched SubQ → IM. Both cardiologist and functional medicine specialist flagged this independently. Hematocrit monitoring overdue — polycythemia is the most common serious TRT adverse effect.",
      whatToListen:
        "Insist on the sensitive assay (LC-MS/MS), not immunoassay — the latter cross-reacts with other steroids and is unreliable in males. If E2 >150 pmol/L, consider whether IM switch alone resolves it or whether dose adjustment (50-60mg/week) is indicated. The echo assesses for LVH from prior supraphysiologic period — the TRAVERSE trial population does not match this 30-year-old.",
    },
    {
      question:
        "CoQ10 dose increase to 200mg ubiquinol is supported by the panel (unanimous safety, moderate efficacy evidence). Counsel patient on priority hierarchy.",
      whyAsk:
        "All three specialists cleared this independently — no CV, renal, or metabolic contraindications at 200mg. Ubiquinol form is pharmacokinetically superior (3-4x bioavailability). The cis-aconitic acid elevation (65 vs ref 10-36) provides mechanistic rationale, though OAT is not validated as a standalone diagnostic. Hepatically cleared — no renal load concern at eGFR 88.",
      whatToListen:
        "The clinical value of this consultation extends well beyond the CoQ10 question. Use the supplement discussion as an entry point to address the larger findings: lipid characterization, inflammatory workup, GFR trajectory, and estradiol monitoring are all higher-priority actions the patient may not have raised independently.",
    },
  ],
  evidence: {
    strong: [
      {
        claim: "CoQ10 supplementation is safe at doses up to 1200mg/day",
        source: "Cochrane systematic review, 2022",
        pmid: "35726131",
      },
      {
        claim:
          "Statin-induced CoQ10 depletion is well-established; supplementation reduces myalgia",
        source: "Meta-analysis, J Am Heart Assoc, 2018",
        pmid: "30571591",
      },
    ],
    moderate: [
      {
        claim:
          "CoQ10 200-300mg improves mitochondrial bioenergetics in patients with documented dysfunction",
        source: "RCT, Mitochondrion, 2021",
        pmid: "33476817",
      },
      {
        claim: "Ubiquinol has 3-4x better bioavailability than ubiquinone",
        source: "Pharmacokinetic study, Regul Toxicol Pharmacol, 2007",
        pmid: "17363131",
      },
      {
        claim:
          "ApoB is superior to LDL-C for cardiovascular risk prediction",
        source: "ESC/EAS Guidelines, 2019; Lancet, 2012",
        pmid: "31504429",
      },
    ],
    preliminary: [
      {
        claim:
          "Elevated urinary cis-aconitic acid correlates with mitochondrial TCA cycle disruption",
        source: "Observational, Clin Chem Lab Med, 2019",
        pmid: "30903754",
      },
      {
        claim:
          "Ketamine nephrotoxicity may cause persistent GFR reduction in chronic users",
        source: "Case series, Urology, 2020",
        pmid: "31980219",
      },
    ],
    unknown: [
      {
        claim:
          "Long-term effects of CoQ10 supplementation on TCA cycle organic acid markers",
        source: "No studies found",
        pmid: null,
      },
      {
        claim:
          "Interaction between TRT-induced erythrocytosis and CoQ10 antioxidant effects on renal perfusion",
        source: "No studies found",
        pmid: null,
      },
    ],
  },
};

/* ===========================================================
   Section Components (page-local)
   =========================================================== */

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      {count !== undefined && (
        <span className="rounded-[var(--mp-radius-sm)] bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
          {count}
        </span>
      )}
    </div>
  );
}

function DisagreementCard({
  topic,
  positions,
}: {
  topic: string;
  positions: {
    specialist: string;
    position: string;
    reasoning: string;
  }[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-[var(--mp-radius)] border border-amber-500/20 bg-amber-500/5">
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-amber-300">{topic}</p>
      </div>
      <div className="space-y-0">
        {positions.map((p) => {
          const isExpanded = expanded === p.specialist;
          return (
            <div
              key={p.specialist}
              className={`border-t border-slate-800/40 specialist-border-${p.specialist}`}
              style={{ borderLeftWidth: "3px" }}
            >
              <button
                type="button"
                className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left"
                onClick={() =>
                  setExpanded(isExpanded ? null : p.specialist)
                }
                aria-expanded={isExpanded}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <SpecialistBadge
                      specialist={p.specialist}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-slate-300">{p.position}</p>
                </div>
                {isExpanded ? (
                  <ChevronUp
                    size={14}
                    className="mt-1 shrink-0 text-slate-500"
                  />
                ) : (
                  <ChevronDown
                    size={14}
                    className="mt-1 shrink-0 text-slate-500"
                  />
                )}
              </button>
              {isExpanded && (
                <div className="border-t border-slate-800/30 px-4 py-3 sm:pl-7">
                  <p className="text-sm leading-relaxed text-slate-400">
                    {p.reasoning}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceSection({
  evidence,
}: {
  evidence: typeof DEMO.evidence;
}) {
  const [openSection, setOpenSection] = useState<string | null>("strong");

  const sections = [
    { key: "strong", label: "Strong", items: evidence.strong },
    { key: "moderate", label: "Moderate", items: evidence.moderate },
    { key: "preliminary", label: "Preliminary", items: evidence.preliminary },
    { key: "unknown", label: "Unknown / No Data", items: evidence.unknown },
  ] as const;

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const isOpen = openSection === section.key;
        return (
          <div
            key={section.key}
            className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900"
          >
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
              onClick={() =>
                setOpenSection(isOpen ? null : section.key)
              }
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2">
                <EvidenceBadge tier={section.key === "unknown" ? "insufficient" : section.key} />
                <span className="text-sm text-slate-300">
                  {section.items.length}{" "}
                  {section.items.length === 1 ? "citation" : "citations"}
                </span>
              </div>
              {isOpen ? (
                <ChevronUp size={14} className="text-slate-500" />
              ) : (
                <ChevronDown size={14} className="text-slate-500" />
              )}
            </button>
            {isOpen && (
              <div className="border-t border-slate-800/50 px-4 py-3">
                <ul className="space-y-3">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />
                      <div>
                        <p className="text-sm text-slate-300">
                          {item.claim}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {item.source}
                          </span>
                          {item.pmid && (
                            <a
                              href={`https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex cursor-pointer items-center gap-1 py-1 font-mono text-xs text-blue-400 transition-colors duration-200 hover:text-blue-300"
                            >
                              PMID:{item.pmid}
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ===========================================================
   Main Results Page
   =========================================================== */

/* ===========================================================
   Patient-mode language overrides
   Same data, different framing for patients vs clinicians.
   =========================================================== */

const PATIENT_LABELS = {
  sectionQuestion: "Your Health Question",
  sectionSafety: "Things That Need Attention",
  sectionConsensus: "What the Panel Agrees On",
  sectionDisagreements: "Doctors See This Differently",
  sectionQuestions: "Questions to Ask Your Doctor",
  sectionEvidence: "What Research Shows",
  disclaimer:
    "This is an educational exploration to help you prepare for your next doctor visit. MedPanel is not a doctor and cannot diagnose or treat. Always talk to your healthcare provider.",
};

const CLINICIAN_LABELS = {
  sectionQuestion: "Clinical Consultation",
  sectionSafety: "Safety Flags",
  sectionConsensus: "Panel Consensus",
  sectionDisagreements: "Clinical Prioritization Divergence",
  sectionQuestions: "Points to Explore With Your Patient",
  sectionEvidence: "Evidence Landscape",
  disclaimer:
    "AI-simulated specialist panel for educational exploration. Not a substitute for clinical judgment. Evidence citations should be independently verified. MedPanel does not constitute medical advice.",
};

/* Patient-mode questions — same content, simpler language */
const PATIENT_QUESTIONS = [
  {
    question:
      "Can we check my cholesterol more thoroughly? I'd like to know my ApoB and Lp(a) numbers.",
    whyAsk:
      "Regular cholesterol tests miss important details. ApoB counts the actual harmful particles, and Lp(a) is a genetic risk factor that 1 in 5 people have. These two numbers give a much clearer picture of your real heart risk.",
    whatToListen:
      "Your doctor should be willing to order these. If they say it's not needed at your age, explain that you're on testosterone replacement and your HDL is very low — both increase risk.",
  },
  {
    question:
      "My inflammation marker (CRP) was high at 5.8. Can we retest it to see if it's better now?",
    whyAsk:
      "This number was from 18 months ago when things were rough. If it's come down with your lifestyle changes, that's great news. If it's still high, something is actively causing inflammation and your doctor can help find out what.",
    whatToListen:
      "If the number is still above 2.0, ask what could be causing it. Common sources: gut health issues, dental problems, insulin resistance, or hidden infections.",
  },
  {
    question:
      "Can we keep an eye on my kidney function with a special test called cystatin C every few months?",
    whyAsk:
      "Your kidneys are working a little below what's expected for your age. One test can't show if this is stable or getting worse — tracking it over time is the only way to know. The standard kidney test is less accurate for muscular people, so cystatin C gives a better picture.",
    whatToListen:
      "Your doctor should agree that monitoring makes sense. Ask whether your past ketamine use could have affected your kidneys and if that changes how often you should be tested.",
  },
  {
    question:
      "I've never had my estrogen levels checked while on testosterone. Can we add that to my next blood test?",
    whyAsk:
      "Testosterone can convert to estrogen in your body. If estrogen gets too high, it can cause water retention, mood changes, and heart risk. Since you recently changed your injection method, now is a good time to check.",
    whatToListen:
      "Make sure they order the 'sensitive' estrogen test (it's more accurate for men). If your levels are high, your doctor can adjust your testosterone dose.",
  },
  {
    question:
      "Is it okay to take 200mg of CoQ10 for my energy levels? All three specialists said it's safe.",
    whyAsk:
      "This was your original question and the good news is clear: it's safe. But the panel also found more important health issues that deserve attention first — your cholesterol, inflammation, and kidney monitoring.",
    whatToListen:
      "Your doctor will likely say yes to CoQ10. Use this as an opening to discuss the bigger findings: 'While we're at it, can we also check my ApoB and retest my CRP?'",
  },
];

export default function ConsultResultPage() {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<ViewMode>("clinician");

  const labels = mode === "patient" ? PATIENT_LABELS : CLINICIAN_LABELS;
  const activeQuestions = mode === "patient" ? PATIENT_QUESTIONS : DEMO.questions;

  function handleCopyAll() {
    const header = mode === "patient"
      ? "Questions to Ask Your Doctor (from MedPanel AI)\n\n"
      : "Points to Explore With Patient (MedPanel AI)\n\n";
    const allQuestions = activeQuestions
      .map((q, i) => `${i + 1}. ${q.question}`)
      .join("\n\n");
    navigator.clipboard.writeText(header + allQuestions).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <Link
          href="/consult"
          className="mb-6 inline-flex items-center gap-1.5 py-2 text-sm text-slate-500 transition-colors duration-200 hover:text-slate-300"
        >
          <ArrowLeft size={14} />
          Back to Consult
        </Link>

        {/* ---- Mode Toggle + Question Header ---- */}
        <section className="mb-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {mode === "patient" ? PATIENT_LABELS.sectionQuestion : CLINICIAN_LABELS.sectionQuestion}
            </p>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
          <h1 className="mb-4 text-lg font-semibold leading-relaxed text-slate-100 sm:text-xl">
            {DEMO.question}
          </h1>
          <div className="flex flex-wrap gap-2">
            {DEMO.specialists.map((s) => (
              <SpecialistBadge key={s} specialist={s} />
            ))}
          </div>
          {mode === "patient" && (
            <div className="mt-3 rounded-[var(--mp-radius)] border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2">
              <p className="text-xs text-emerald-400">
                This exploration helps you prepare informed questions for your next doctor visit. It is not medical advice.
              </p>
            </div>
          )}
        </section>

        {/* ---- Safety Flags ---- */}
        <section className="mb-8">
          <SectionHeader
            icon={<ShieldAlert size={18} className="text-amber-400" />}
            title={mode === "patient" ? PATIENT_LABELS.sectionSafety : CLINICIAN_LABELS.sectionSafety}
            count={DEMO.safetyFlags.length}
          />
          <div className="space-y-2">
            {DEMO.safetyFlags.map((flag, i) => (
              <SafetyFlag key={i} {...flag} />
            ))}
          </div>
        </section>

        {/* ---- Panel Consensus ---- */}
        <section className="mb-8">
          <SectionHeader
            icon={
              <CircleCheckBig size={18} className="text-emerald-400" />
            }
            title={mode === "patient" ? PATIENT_LABELS.sectionConsensus : CLINICIAN_LABELS.sectionConsensus}
            count={DEMO.consensus.length}
          />
          <div className="space-y-2">
            {DEMO.consensus.map((item, i) => (
              <ConsensusItem key={i} {...item} />
            ))}
          </div>
        </section>

        {/* ---- Where Perspectives Differ ---- */}
        <section className="mb-8">
          <SectionHeader
            icon={
              <CircleAlert size={18} className="text-amber-400" />
            }
            title={mode === "patient" ? PATIENT_LABELS.sectionDisagreements : CLINICIAN_LABELS.sectionDisagreements}
            count={DEMO.disagreements.length}
          />
          <div className="space-y-3">
            {DEMO.disagreements.map((d, i) => (
              <DisagreementCard key={i} {...d} />
            ))}
          </div>
        </section>

        {/* ---- Questions Section (mode-aware) ---- */}
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionHeader
              icon={
                <Stethoscope size={18} className="text-emerald-400" />
              }
              title={mode === "patient" ? PATIENT_LABELS.sectionQuestions : CLINICIAN_LABELS.sectionQuestions}
              count={mode === "patient" ? PATIENT_QUESTIONS.length : DEMO.questions.length}
            />
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--mp-radius)] border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors duration-200 hover:border-slate-600 hover:text-slate-100"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy All
                </>
              )}
            </button>
          </div>
          {mode === "patient" && (
            <div className="mb-3 rounded-[var(--mp-radius)] border border-blue-500/15 bg-blue-500/[0.04] px-3 py-2">
              <p className="text-xs text-blue-400">
                Bring these questions to your next appointment. They are based on what the specialist panel found in your profile.
              </p>
            </div>
          )}
          {mode === "clinician" && (
            <div className="mb-3 rounded-[var(--mp-radius)] border border-blue-500/15 bg-blue-500/[0.04] px-3 py-2">
              <p className="text-xs text-blue-400">
                Discussion points derived from cross-specialist analysis. Evidence tiers and guideline references included where applicable.
              </p>
            </div>
          )}
          <div className="space-y-2">
            {(mode === "patient" ? PATIENT_QUESTIONS : DEMO.questions).map((q, i) => (
              <QuestionCard key={`${mode}-${i}`} number={i + 1} {...q} />
            ))}
          </div>
        </section>

        {/* ---- Evidence Landscape ---- */}
        <section className="mb-8">
          <SectionHeader
            icon={<BookOpen size={18} className="text-blue-400" />}
            title={mode === "patient" ? PATIENT_LABELS.sectionEvidence : CLINICIAN_LABELS.sectionEvidence}
          />
          <EvidenceSection evidence={DEMO.evidence} />
        </section>

        {/* ---- Disclaimer Footer ---- */}
        <footer className="rounded-[var(--mp-radius)] border border-slate-800/60 bg-gray-900/50 px-4 py-4">
          <p className="text-center text-xs leading-relaxed text-slate-500">
            {mode === "patient" ? PATIENT_LABELS.disclaimer : CLINICIAN_LABELS.disclaimer}
          </p>
        </footer>
      </main>

      {/* ---- Mobile Sticky Copy Bar ---- */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-[#0A0F1C]/95 px-4 py-3 backdrop-blur-md sm:hidden">
        <button
          type="button"
          onClick={handleCopyAll}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--mp-radius)] bg-emerald-600 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
        >
          {copied ? (
            <>
              <Check size={16} />
              Copied to Clipboard
            </>
          ) : (
            <>
              <Copy size={16} />
              Copy All Questions
            </>
          )}
        </button>
      </div>

      {/* Bottom padding to offset mobile sticky bar */}
      <div className="h-20 sm:h-0" />
    </div>
  );
}
