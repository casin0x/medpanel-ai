import {
  Heart,
  Pill,
  Brain,
  Leaf,
  Beaker,
  Activity,
  type LucideIcon,
} from "lucide-react";

const SPECIALIST_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; Icon: LucideIcon }
> = {
  cardiologist: {
    label: "Cardiologist",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/25",
    Icon: Heart,
  },
  nephrologist: {
    label: "Nephrologist",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    Icon: Activity,
  },
  functional_medicine: {
    label: "Functional Medicine",
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/25",
    Icon: Leaf,
  },
  neuropsychiatrist: {
    label: "Neuropsychiatrist",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    Icon: Brain,
  },
  endocrinologist: {
    label: "Endocrinologist",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/25",
    Icon: Beaker,
  },
  pharmacologist: {
    label: "Pharmacologist",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    Icon: Pill,
  },
};

interface SpecialistBadgeProps {
  specialist: string;
  size?: "sm" | "md";
}

export function SpecialistBadge({
  specialist,
  size = "md",
}: SpecialistBadgeProps) {
  const config = SPECIALIST_CONFIG[specialist] ?? {
    label: specialist,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/25",
    Icon: Activity,
  };

  const { label, color, bg, border, Icon } = config;

  const sizeClasses =
    size === "sm"
      ? "gap-1 px-2 py-0.5 text-xs"
      : "gap-1.5 px-2.5 py-1 text-sm";

  const iconSize = size === "sm" ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center rounded border font-medium transition-colors duration-200 ${color} ${bg} ${border} ${sizeClasses}`}
    >
      <Icon className="shrink-0" size={iconSize} />
      {label}
    </span>
  );
}

export { SPECIALIST_CONFIG };
