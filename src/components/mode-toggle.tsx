"use client";

import { Stethoscope, User, ArrowLeftRight } from "lucide-react";

export type ViewMode = "patient" | "clinician";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div className="flex items-center gap-1.5 animate-pulse text-[10px] text-emerald-400">
        <ArrowLeftRight size={10} />
        <span>Switch between patient and clinician view</span>
      </div>

      <div className="inline-flex items-center rounded-[var(--mp-radius)] border border-emerald-500/30 bg-gray-900/80 p-0.5 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
        <button
          onClick={() => onChange("patient")}
          className={`flex cursor-pointer items-center gap-1.5 rounded-[var(--mp-radius-sm)] px-3 py-2.5 text-xs font-medium transition-colors duration-200 sm:py-1.5 ${
            mode === "patient"
              ? "bg-emerald-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <User size={12} />
          Patient
        </button>
        <button
          onClick={() => onChange("clinician")}
          className={`flex cursor-pointer items-center gap-1.5 rounded-[var(--mp-radius-sm)] px-3 py-2.5 text-xs font-medium transition-colors duration-200 sm:py-1.5 ${
            mode === "clinician"
              ? "bg-blue-600 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Stethoscope size={12} />
          Clinician
        </button>
      </div>
    </div>
  );
}
