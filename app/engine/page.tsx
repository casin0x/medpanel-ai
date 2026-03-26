"use client";

import { useState, useEffect } from "react";
import { Nav } from "@/components/nav";
import {
  Heart,
  Beaker,
  Microscope,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Zap,
  Search,
  Shield,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";

/* ── Step timing (ms from page load) ── */
const TIMINGS = {
  questionAppears: 800,
  classificationStart: 2200,
  classificationDone: 3500,
  evidenceStart: 3800,
  evidenceDone: 5500,
  specialistsSpawn: 6000,
  specialist1Done: 8000,
  specialist2Done: 9000,
  specialist3Done: 9500,
  discussionStart: 10500,
  message1: 11200,
  message2: 12200,
  message3: 13200,
  message4: 14200,
  consensusStart: 15500,
  consensusDone: 17000,
  outputReady: 18000,
};

const SPECIALISTS = [
  { name: "Cardiologist", color: "border-pink-500 bg-pink-500/10 text-pink-400", dot: "bg-pink-500", Icon: Heart },
  { name: "Nephrologist", color: "border-violet-500 bg-violet-500/10 text-violet-400", dot: "bg-violet-500", Icon: Beaker },
  { name: "Functional Med", color: "border-teal-500 bg-teal-500/10 text-teal-400", dot: "bg-teal-500", Icon: Microscope },
];

const DISCUSSION_MESSAGES = [
  { from: 0, text: "LDL 151 / HDL 36 is the most immediate actionable risk. I'd prioritize ApoB and Lp(a) testing before any supplement changes.", type: "analysis" as const },
  { from: 1, text: "I disagree on priority. eGFR dropped from 68→61 in 6 months — that trajectory needs serial cystatin C before anything else. Berberine's renal clearance is a concern here.", type: "disagreement" as const },
  { from: 2, text: "Both valid, but the CRP of 4.2 connects them. Systemic inflammation may be driving both the lipid pattern AND the GFR decline. Address upstream first.", type: "challenge" as const },
  { from: 0, text: "Agreed on CRP investigation. But I'd still order the ApoB simultaneously — we can run both workups in parallel. The berberine question is secondary to these findings.", type: "resolution" as const },
];

export default function EnginePage() {
  const [now, setNow] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setNow(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [started]);

  const past = (time: number) => now >= time;

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
            Behind the Scenes
          </p>
          <h1 className="mb-3 text-2xl font-bold text-slate-100 sm:text-3xl">
            How the Engine Works
          </h1>
          <p className="mx-auto max-w-xl text-sm text-slate-400">
            Watch a real consultation unfold — from question to multi-specialist
            discussion to structured output.
          </p>
        </div>

        {!started ? (
          <div className="text-center py-12">
            <button
              onClick={() => setStarted(true)}
              className="cursor-pointer inline-flex items-center gap-2 rounded-[var(--mp-radius)] bg-emerald-600 px-8 py-3.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
            >
              <Zap size={16} />
              Run Live Demo
            </button>
            <p className="mt-3 text-xs text-slate-500">~18 seconds · Animated walkthrough</p>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── STEP 1: Question Input ── */}
            <StepCard
              active={past(TIMINGS.questionAppears)}
              done={past(TIMINGS.classificationStart)}
              step="1"
              title="Patient Question Received"
              icon={<MessageSquare size={14} />}
            >
              {past(TIMINGS.questionAppears) && (
                <div className="mt-2 rounded-[var(--mp-radius)] border border-slate-700/50 bg-slate-800/50 px-3 py-2">
                  <p className="text-sm text-slate-200">
                    &ldquo;My eGFR dropped from 68 to 61 in 6 months. Is berberine safe for my kidneys?&rdquo;
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Patient: 52F · T2D · CKD 3a · HTN · Metformin + Lisinopril
                  </p>
                </div>
              )}
            </StepCard>

            {/* ── STEP 2: Classification ── */}
            <StepCard
              active={past(TIMINGS.classificationStart)}
              done={past(TIMINGS.classificationDone)}
              step="2"
              title="AI Classifier Routes Question"
              icon={<Zap size={14} />}
            >
              {past(TIMINGS.classificationStart) && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Intent:</span>
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-400">medication_management</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Domains:</span>
                    <span className="rounded bg-pink-500/10 px-1.5 py-0.5 text-pink-400">cardiology</span>
                    <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-violet-400">nephrology</span>
                    <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-teal-400">metabolic</span>
                  </div>
                  {past(TIMINGS.classificationDone) && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Complexity:</span>
                      <span className="font-mono text-amber-400">6.8</span>
                      <span className="text-slate-600">→ 3 specialists selected</span>
                    </div>
                  )}
                </div>
              )}
            </StepCard>

            {/* ── STEP 3: Evidence Retrieval ── */}
            <StepCard
              active={past(TIMINGS.evidenceStart)}
              done={past(TIMINGS.evidenceDone)}
              step="3"
              title="Evidence Retrieved from PubMed"
              icon={<Search size={14} />}
            >
              {past(TIMINGS.evidenceStart) && (
                <div className="mt-2 space-y-1">
                  {[
                    { id: "C-001", title: "Berberine nephrotoxicity profile in CKD patients", pmid: "34821156", delay: 0 },
                    { id: "C-002", title: "SGLT2i vs berberine for glycemic control with renal decline", pmid: "35924783", delay: 400 },
                    { id: "C-003", title: "Metformin dose adjustment in eGFR 45-60", pmid: "33487291", delay: 800 },
                    { id: "C-004", title: "CKD progression rate prediction from serial eGFR", pmid: "36129445", delay: 1100 },
                  ].map((study) =>
                    past(TIMINGS.evidenceStart + study.delay) ? (
                      <div key={study.id} className="flex items-center gap-2 text-[11px]">
                        <BookOpen size={10} className="shrink-0 text-blue-400" />
                        <span className="font-mono text-blue-400">[{study.id}]</span>
                        <span className="text-slate-400">{study.title}</span>
                        <span className="font-mono text-slate-600">PMID:{study.pmid}</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </StepCard>

            {/* ── STEP 4: Specialists Spawn ── */}
            <StepCard
              active={past(TIMINGS.specialistsSpawn)}
              done={past(TIMINGS.specialist3Done)}
              step="4"
              title="Specialist Agents Analyzing (Round 1)"
              icon={<Shield size={14} />}
            >
              {past(TIMINGS.specialistsSpawn) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {SPECIALISTS.map((spec, i) => {
                    const doneTime = [TIMINGS.specialist1Done, TIMINGS.specialist2Done, TIMINGS.specialist3Done][i]!;
                    const isDone = past(doneTime);
                    return (
                      <div
                        key={spec.name}
                        className={`rounded-[var(--mp-radius)] border border-l-2 p-3 transition-all duration-500 ${
                          isDone
                            ? `${spec.color} border-t-slate-800/50 border-r-slate-800/50 border-b-slate-800/50`
                            : "border-slate-800 bg-slate-800/30"
                        }`}
                      >
                        <div className="mb-1.5 flex items-center gap-2">
                          <spec.Icon size={12} className={isDone ? "" : "text-slate-600"} />
                          <span className={`text-xs font-medium ${isDone ? "" : "text-slate-500"}`}>
                            {spec.name}
                          </span>
                        </div>
                        {isDone ? (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                            <CheckCircle2 size={10} />
                            Analysis complete
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] text-slate-600">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                            Analyzing...
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </StepCard>

            {/* ── STEP 5: Cross-Examination (the wow moment) ── */}
            <StepCard
              active={past(TIMINGS.discussionStart)}
              done={past(TIMINGS.consensusStart)}
              step="5"
              title="Cross-Examination (Round 2)"
              icon={<MessageSquare size={14} />}
            >
              {past(TIMINGS.discussionStart) && (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] italic text-slate-500">
                    Specialists review each other&apos;s findings, challenge assumptions, and debate priorities...
                  </p>
                  <div className="space-y-2">
                    {DISCUSSION_MESSAGES.map((msg, i) => {
                      const msgTime = [TIMINGS.message1, TIMINGS.message2, TIMINGS.message3, TIMINGS.message4][i]!;
                      if (!past(msgTime)) return null;
                      const spec = SPECIALISTS[msg.from]!;
                      return (
                        <div
                          key={i}
                          className={`rounded-[var(--mp-radius)] border border-l-2 bg-slate-800/30 p-3 ${
                            spec.color.split(" ")[0]
                          } border-t-slate-800/30 border-r-slate-800/30 border-b-slate-800/30`}
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 rounded-full ${spec.dot}`} />
                            <span className={`text-[10px] font-semibold ${spec.color.split(" ").pop()}`}>
                              {spec.name}
                            </span>
                            {msg.type === "disagreement" && (
                              <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-medium text-amber-400">
                                DISAGREES
                              </span>
                            )}
                            {msg.type === "challenge" && (
                              <span className="rounded bg-teal-500/10 px-1 py-0.5 text-[8px] font-medium text-teal-400">
                                CHALLENGES
                              </span>
                            )}
                            {msg.type === "resolution" && (
                              <span className="rounded bg-emerald-500/10 px-1 py-0.5 text-[8px] font-medium text-emerald-400">
                                RESOLVES
                              </span>
                            )}
                          </div>
                          <p className="text-xs leading-relaxed text-slate-300">
                            {msg.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </StepCard>

            {/* ── STEP 6: Consensus ── */}
            <StepCard
              active={past(TIMINGS.consensusStart)}
              done={past(TIMINGS.consensusDone)}
              step="6"
              title="Synthesis & Consensus Detection"
              icon={<CheckCircle2 size={14} />}
            >
              {past(TIMINGS.consensusStart) && (
                <div className="mt-2 space-y-1.5">
                  {[
                    { text: "Berberine is not recommended with eGFR <60 and active decline", type: "unanimous" },
                    { text: "SGLT2 inhibitor (dapagliflozin) preferred — dual benefit for glucose + renal protection", type: "majority" },
                    { text: "Serial cystatin C q3 months to establish GFR trajectory before any supplement changes", type: "unanimous" },
                  ].map((item, i) =>
                    past(TIMINGS.consensusStart + i * 500) ? (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span className="text-slate-300">{item.text}</span>
                        <span className={`ml-auto shrink-0 rounded px-1 py-0.5 text-[8px] font-medium ${
                          item.type === "unanimous" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {item.type === "unanimous" ? "3/3" : "2/3"}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </StepCard>

            {/* ── STEP 7: Output Ready ── */}
            {past(TIMINGS.outputReady) && (
              <div className="mt-6 rounded-[var(--mp-radius)] border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-400" />
                <p className="mb-1 text-sm font-semibold text-emerald-400">
                  Consultation Complete
                </p>
                <p className="mb-4 text-xs text-slate-400">
                  3 specialists · 2 rounds · 4 evidence citations · 3 consensus items · 7 questions generated
                </p>
                <Link
                  href="/consult/demo"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--mp-radius)] bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-500"
                >
                  View Full Results
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min((now / TIMINGS.outputReady) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-slate-600">
                <span>Classification</span>
                <span>Evidence</span>
                <span>Analysis</span>
                <span>Discussion</span>
                <span>Consensus</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Reusable step card ── */
function StepCard({
  active,
  done,
  step,
  title,
  icon,
  children,
}: {
  active: boolean;
  done: boolean;
  step: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!active) return null;

  return (
    <div
      className={`rounded-[var(--mp-radius)] border p-4 transition-all duration-500 ${
        done
          ? "border-slate-800 bg-gray-900/50"
          : "border-emerald-500/20 bg-emerald-500/[0.02] shadow-[0_0_15px_rgba(16,185,129,0.05)]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
            done
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-emerald-500/10 text-emerald-500 animate-pulse"
          }`}
        >
          {done ? <CheckCircle2 size={12} /> : step}
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${done ? "text-slate-400" : "text-slate-100"}`}>
          {icon}
          {title}
        </div>
        {!done && (
          <span className="ml-auto text-[10px] text-emerald-500 animate-pulse">
            Processing...
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
