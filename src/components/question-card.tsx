"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, Stethoscope } from "lucide-react";

interface QuestionCardProps {
  number: number;
  question: string;
  whyAsk?: string;
  whatToListen?: string;
}

export function QuestionCard({
  number,
  question,
  whyAsk,
  whatToListen,
}: QuestionCardProps) {
  const [whyExpanded, setWhyExpanded] = useState(false);
  const [listenExpanded, setListenExpanded] = useState(false);

  return (
    <div className="rounded-[var(--mp-radius)] border border-slate-800 bg-gray-900 transition-colors duration-200 hover:border-slate-700">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--mp-radius-sm)] bg-emerald-500/15 text-xs font-semibold text-emerald-400">
            {number}
          </span>
          <p className="text-sm font-medium leading-relaxed text-slate-100">
            {question}
          </p>
        </div>
      </div>

      {(whyAsk || whatToListen) && (
        <div className="border-t border-slate-800/60 px-4 py-2">
          <div className="flex flex-wrap gap-1">
            {whyAsk && (
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--mp-radius-sm)] px-2.5 py-2 text-xs text-slate-400 transition-colors duration-200 hover:bg-slate-800 hover:text-slate-300"
                onClick={() => setWhyExpanded(!whyExpanded)}
                aria-expanded={whyExpanded}
              >
                <HelpCircle size={14} className="shrink-0" />
                Why ask this
                {whyExpanded ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
            )}
            {whatToListen && (
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--mp-radius-sm)] px-2.5 py-2 text-xs text-slate-400 transition-colors duration-200 hover:bg-slate-800 hover:text-slate-300"
                onClick={() => setListenExpanded(!listenExpanded)}
                aria-expanded={listenExpanded}
              >
                <Stethoscope size={14} className="shrink-0" />
                What to listen for
                {listenExpanded ? (
                  <ChevronUp size={12} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </button>
            )}
          </div>

          {whyExpanded && whyAsk && (
            <div className="mt-2 rounded-[var(--mp-radius-sm)] bg-slate-800/50 px-3 py-2">
              <p className="text-xs leading-relaxed text-slate-400">{whyAsk}</p>
            </div>
          )}

          {listenExpanded && whatToListen && (
            <div className="mt-2 rounded-[var(--mp-radius-sm)] bg-slate-800/50 px-3 py-2">
              <p className="text-xs leading-relaxed text-slate-400">
                {whatToListen}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
