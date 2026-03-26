import {
  ShieldCheck,
  ShieldAlert,
  FlaskConical,
  Microscope,
  UserCheck,
  ShieldQuestion,
  type LucideIcon,
} from "lucide-react";

const TIER_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; Icon: LucideIcon }
> = {
  strong: {
    label: "Strong Evidence",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    Icon: ShieldCheck,
  },
  moderate: {
    label: "Moderate Evidence",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    Icon: ShieldAlert,
  },
  preliminary: {
    label: "Preliminary Evidence",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    Icon: FlaskConical,
  },
  mechanistic: {
    label: "Mechanistic",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/25",
    Icon: Microscope,
  },
  expert_opinion: {
    label: "Expert Opinion",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    Icon: UserCheck,
  },
  insufficient: {
    label: "Insufficient",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/25",
    Icon: ShieldQuestion,
  },
};

interface EvidenceBadgeProps {
  tier: string;
}

export function EvidenceBadge({ tier }: EvidenceBadgeProps) {
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.insufficient;
  const { label, color, bg, border, Icon } = config;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${color} ${bg} ${border}`}
    >
      <Icon size={12} className="shrink-0" />
      {label}
    </span>
  );
}

export { TIER_CONFIG };
