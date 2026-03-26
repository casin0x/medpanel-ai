"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  User,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Nav } from "@/components/nav";

const DEMO_QUESTION =
  "My eGFR dropped from 68 to 61 in 6 months. I take metformin and want to add berberine for blood sugar. Is berberine safe for my kidneys?";

const EXAMPLE_QUESTIONS = [
  "My eGFR dropped from 68 to 61 — is berberine safe for my kidneys?",
  "Should I switch from metformin to an SGLT2 inhibitor given my kidney decline?",
  "My HbA1c is 7.2% on metformin — what else can I do without adding more medications?",
  "Is CoQ10 helpful for kidney protection in Type 2 Diabetes?",
  "What supplements should I avoid with declining kidney function?",
];

const TYPE_SPEED = 35; // ms per character
const START_DELAY = 1200; // ms before typing starts

export default function ConsultInputPage() {
  const [question, setQuestion] = useState("");
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(true);
  const [typedChars, setTypedChars] = useState(0);
  const [ctaReady, setCtaReady] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typewriter effect
  useEffect(() => {
    if (!isTyping) return;

    const startTimeout = setTimeout(() => {
      let charIndex = 0;
      const interval = setInterval(() => {
        charIndex++;
        setTypedChars(charIndex);
        setQuestion(DEMO_QUESTION.slice(0, charIndex));

        if (charIndex >= DEMO_QUESTION.length) {
          clearInterval(interval);
          setIsTyping(false);
          // CTA lights up after a brief pause
          setTimeout(() => setCtaReady(true), 400);
        }
      }, TYPE_SPEED);

      return () => clearInterval(interval);
    }, START_DELAY);

    return () => clearTimeout(startTimeout);
  }, [isTyping]);

  // If user clicks into textarea, stop typing and let them edit
  function handleTextareaFocus() {
    if (isTyping) {
      setIsTyping(false);
      setCtaReady(question.trim().length > 10);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setIsTyping(false);
    setQuestion(e.target.value);
    setCtaReady(e.target.value.trim().length > 10);
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Profile Summary Card */}
        <div className="mb-6 rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <User size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  Patient Profile
                </p>
                <p className="text-[11px] text-slate-500">Updated today</p>
              </div>
            </div>
            <Link
              href="/profile"
              className="cursor-pointer rounded-[var(--mp-radius-sm)] border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400 transition-colors duration-200 hover:border-slate-600 hover:text-slate-200"
            >
              Edit Profile
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-[var(--mp-radius-sm)] bg-slate-800/60 px-3 py-2">
              <p className="text-[10px] text-slate-500">Demographics</p>
              <p className="font-mono text-sm font-medium text-slate-200">
                52F <span className="text-slate-500">·</span> 68kg
              </p>
            </div>
            <div className="rounded-[var(--mp-radius-sm)] bg-slate-800/60 px-3 py-2">
              <p className="text-[10px] text-slate-500">Conditions</p>
              <p className="text-sm font-medium text-slate-200">
                T2D <span className="text-slate-500">·</span> CKD 3a <span className="text-slate-500">·</span> HTN
              </p>
            </div>
            <div className="rounded-[var(--mp-radius-sm)] bg-slate-800/60 px-3 py-2">
              <p className="text-[10px] text-slate-500">Medications</p>
              <p className="text-sm font-medium text-slate-200">
                Metformin <span className="text-slate-500">·</span> Lisinopril
              </p>
            </div>
            <div className="rounded-[var(--mp-radius-sm)] bg-slate-800/60 px-3 py-2">
              <p className="text-[10px] text-slate-500">Key Labs</p>
              <p className="font-mono text-sm font-medium text-slate-200">
                eGFR <span className="text-red-400">61</span>
                <span className="mx-1 text-slate-600">·</span>
                A1c <span className="text-amber-400">7.2</span>
              </p>
            </div>
          </div>
        </div>

        {/* Question Input with typewriter */}
        <div className="mb-4 relative">
          <label htmlFor="question" className="sr-only">
            Your health question
          </label>
          <textarea
            ref={textareaRef}
            id="question"
            rows={5}
            placeholder="Ask your health question..."
            value={question}
            onFocus={handleTextareaFocus}
            onChange={handleTextareaChange}
            className={`w-full resize-none rounded-[var(--mp-radius)] border bg-gray-900 px-4 py-3 text-base text-slate-100 placeholder-slate-600 transition-all duration-200 focus:outline-none focus:ring-1 ${
              isTyping
                ? "border-emerald-500/30 ring-1 ring-emerald-500/10"
                : "border-slate-800 focus:border-emerald-500/50 focus:ring-emerald-500/30"
            }`}
          />
          {isTyping && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[10px] text-emerald-500/70">typing demo...</span>
            </div>
          )}
        </div>

        {/* Examples Dropdown */}
        <div className="mb-6">
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500 transition-colors duration-200 hover:text-slate-300"
            onClick={() => setExamplesOpen(!examplesOpen)}
          >
            <Sparkles size={12} />
            Example questions
            {examplesOpen ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>

          {examplesOpen && (
            <div className="mt-2 space-y-1">
              {EXAMPLE_QUESTIONS.map((eq) => (
                <button
                  key={eq}
                  type="button"
                  className="block w-full cursor-pointer rounded-[var(--mp-radius-sm)] px-3 py-2 text-left text-sm text-slate-400 transition-colors duration-200 hover:bg-slate-800/60 hover:text-slate-200"
                  onClick={() => {
                    setQuestion(eq);
                    setIsTyping(false);
                    setCtaReady(true);
                  }}
                >
                  {eq}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Estimation */}
        <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
          <span>3 specialists</span>
          <span className="text-slate-700">|</span>
          <span>~2 min</span>
        </div>

        {/* Submit Button — lights up when typing completes */}
        <Link
          href="/consult/demo"
          className={`flex w-full items-center justify-center gap-2 rounded-[var(--mp-radius)] py-3.5 text-sm font-medium transition-all duration-500 ${
            ctaReady
              ? "cursor-pointer bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500"
              : "cursor-default bg-slate-800/80 text-slate-600"
          }`}
          onClick={(e) => {
            if (!ctaReady) e.preventDefault();
          }}
        >
          Explore This Question
          <ArrowRight size={16} className={ctaReady ? "animate-pulse" : ""} />
        </Link>

        <p className="mt-3 text-center text-xs text-slate-600">
          Results are for educational exploration only. Not medical advice.
        </p>

        {/* Recent Consultations */}
        <div className="mt-12">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-600">
            Recent Consultations
          </p>
          <div className="space-y-2">
            <Link
              href="/consult/demo"
              className="block cursor-pointer rounded-[var(--mp-radius)] border border-slate-800/60 bg-gray-900/50 px-4 py-3 transition-colors duration-200 hover:border-slate-700"
            >
              <p className="text-sm text-slate-300">
                Berberine safety with declining kidney function
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                <span>Today</span>
                <span className="text-slate-800">|</span>
                <span>3 specialists</span>
                <span className="text-slate-800">|</span>
                <span>3 safety flags</span>
              </div>
            </Link>
            <Link
              href="/consult/demo"
              className="block cursor-pointer rounded-[var(--mp-radius)] border border-slate-800/60 bg-gray-900/30 px-4 py-3 transition-colors duration-200 hover:border-slate-700"
            >
              <p className="text-sm text-slate-400">
                SGLT2 inhibitor vs metformin adjustment
              </p>
              <div className="mt-1 text-xs text-slate-600">2 days ago</div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
