"use client";

import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; Icon: LucideIcon }
> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-500/8",
    border: "border-red-500/30",
    Icon: ShieldAlert,
  },
  high: {
    label: "High",
    color: "text-orange-400",
    bg: "bg-orange-500/8",
    border: "border-orange-500/30",
    Icon: AlertTriangle,
  },
  moderate: {
    label: "Moderate",
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/30",
    Icon: AlertTriangle,
  },
  low: {
    label: "Low",
    color: "text-blue-400",
    bg: "bg-blue-500/8",
    border: "border-blue-500/30",
    Icon: AlertCircle,
  },
  informational: {
    label: "Info",
    color: "text-slate-400",
    bg: "bg-slate-500/8",
    border: "border-slate-500/30",
    Icon: Info,
  },
};

interface SafetyFlagProps {
  severity: string;
  title: string;
  description: string;
  action?: string;
}

export function SafetyFlag({
  severity,
  title,
  description,
  action,
}: SafetyFlagProps) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.informational;
  const { label, color, bg, border, Icon } = config;

  return (
    <div className={`rounded-[var(--mp-radius)] border ${border} ${bg}`}>
      <button
        type="button"
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <Icon size={18} className={`mt-0.5 shrink-0 ${color}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className={`shrink-0 rounded-[var(--mp-radius-sm)] border px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${color} ${border}`}
            >
              {label}
            </span>
            <span className="text-sm font-medium text-slate-200">{title}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="mt-1 shrink-0 text-slate-500" />
        ) : (
          <ChevronDown size={16} className="mt-1 shrink-0 text-slate-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-800/50 px-4 py-3 pl-4 sm:pl-11">
          <p className="text-sm leading-relaxed text-slate-300">{description}</p>
          {action && (
            <div className="mt-2 flex items-start gap-2">
              <span className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Action
              </span>
              <p className="text-sm text-slate-300">{action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
