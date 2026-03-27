import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, GLASS } from "../constants";

const PROBLEMS = [
  { text: "Getting multiple specialist opinions takes weeks", delay: 0 },
  { text: "Most AI gives you one generic answer", delay: 12 },
  { text: "No cross-examination. No disagreements surfaced.", delay: 24 },
  { text: "No citations. No evidence tiers. No accountability.", delay: 36 },
];

export function Scene02Problem() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({ frame, fps, config: { damping: 30 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div style={{ maxWidth: 1100, width: "100%" }}>
        {/* Title */}
        <h2
          style={{
            fontSize: 44,
            color: COLORS.text,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            marginBottom: 60,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          The problem with{" "}
          <span style={{ color: COLORS.textDim }}>single-model AI</span>
        </h2>

        {/* Problem cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {PROBLEMS.map((p, i) => {
            const cardSpring = spring({
              frame: frame - 20 - p.delay,
              fps,
              config: { damping: 20, stiffness: 80 },
            });
            const cardX = interpolate(cardSpring, [0, 1], [-60, 0]);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "24px 32px",
                  backgroundColor: GLASS.bg,
                  border: `1px solid ${GLASS.border}`,
                  borderRadius: 12,
                  opacity: cardSpring,
                  transform: `translateX(${cardX}px)`,
                }}
              >
                {/* X mark instead of emoji */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.red} strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span
                  style={{
                    fontSize: 26,
                    color: COLORS.textMuted,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {p.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
