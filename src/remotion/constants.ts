export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene durations in seconds
export const SCENES = [
  { id: "hook", duration: 5 },
  { id: "problem", duration: 8 },
  { id: "product-intro", duration: 6 },
  { id: "how-it-works", duration: 12 },
  { id: "consensus", duration: 8 },
  { id: "disagreements", duration: 8 },
  { id: "questions", duration: 8 },
  { id: "dual-mode", duration: 6 },
  { id: "evidence", duration: 5 },
  { id: "cta", duration: 7 },
] as const;

// Calculate total duration
export const TOTAL_DURATION_SEC = SCENES.reduce((sum, s) => sum + s.duration, 0); // 65s
export const TOTAL_FRAMES = TOTAL_DURATION_SEC * FPS;

// Scene start frames (cumulative)
export function getSceneStart(index: number): number {
  let start = 0;
  for (let i = 0; i < index; i++) {
    start += SCENES[i].duration * FPS;
  }
  return start;
}

export function getSceneDuration(index: number): number {
  return SCENES[index].duration * FPS;
}

// MedPanel design system colors (matching the product)
export const COLORS = {
  bg: "#0A0F1C",
  surface: "#111827",
  surfaceLight: "#1e293b",
  primary: "#10b981", // emerald-500
  primaryLight: "#34d399", // emerald-400
  primaryDim: "#065f46", // emerald-800
  blue: "#3b82f6",
  amber: "#f59e0b",
  red: "#ef4444",
  pink: "#ec4899",
  violet: "#8b5cf6",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  text: "#f1f5f9", // slate-100
  textMuted: "#94a3b8", // slate-400
  textDim: "#475569", // slate-600
  border: "rgba(148, 163, 184, 0.1)",
  borderLight: "rgba(148, 163, 184, 0.2)",
  white: "#ffffff",
} as const;

// Specialist colors (matching the product UI)
export const SPECIALIST_COLORS = {
  cardiologist: { bg: "rgba(236,72,153,0.1)", text: "#f472b6", border: "rgba(236,72,153,0.3)" },
  nephrologist: { bg: "rgba(139,92,246,0.1)", text: "#a78bfa", border: "rgba(139,92,246,0.3)" },
  functional_medicine: { bg: "rgba(20,184,166,0.1)", text: "#2dd4bf", border: "rgba(20,184,166,0.3)" },
  endocrinologist: { bg: "rgba(6,182,212,0.1)", text: "#22d3ee", border: "rgba(6,182,212,0.3)" },
  neuropsychiatrist: { bg: "rgba(249,115,22,0.1)", text: "#fb923c", border: "rgba(249,115,22,0.3)" },
  pharmacologist: { bg: "rgba(168,85,247,0.1)", text: "#c084fc", border: "rgba(168,85,247,0.3)" },
} as const;

export const GLASS = {
  bg: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.06)",
  shadow: "0 8px 32px rgba(0,0,0,0.4)",
} as const;
