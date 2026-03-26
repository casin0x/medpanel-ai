import { CircleCheck } from "lucide-react";
import { SpecialistBadge } from "./specialist-badge";
import { EvidenceBadge } from "./evidence-badge";

interface ConsensusItemProps {
  text: string;
  specialists: string[];
  evidenceTier?: string;
}

export function ConsensusItem({
  text,
  specialists,
  evidenceTier,
}: ConsensusItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--mp-radius)] border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
      <CircleCheck
        size={18}
        className="mt-0.5 shrink-0 text-emerald-400"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-relaxed text-slate-200">
          {text}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">
            {specialists.length}/{specialists.length} specialists
          </span>
          <span className="text-slate-700">|</span>
          <div className="flex flex-wrap gap-1">
            {specialists.map((s) => (
              <SpecialistBadge key={s} specialist={s} size="sm" />
            ))}
          </div>
          {evidenceTier && (
            <>
              <span className="text-slate-700">|</span>
              <EvidenceBadge tier={evidenceTier} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
