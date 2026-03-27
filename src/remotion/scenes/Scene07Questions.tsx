import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, GLASS } from "../constants";

const QUESTIONS = [
  { num: 1, text: "Should we switch to dapagliflozin for dual kidney-glucose benefit?", delay: 20 },
  { num: 2, text: "Can we track eGFR trajectory with cystatin C every 3 months?", delay: 40 },
  { num: 3, text: "What is causing the rapid eGFR decline — diabetes or something else?", delay: 60 },
  { num: 4, text: "Is berberine safe to add, or should we wait until kidney function stabilizes?", delay: 80 },
];

export function Scene07Questions() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 30 } });
  const subtitleSpring = spring({ frame: frame - 10, fps, config: { damping: 30 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div style={{ maxWidth: 1000, width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p
            style={{
              fontSize: 14,
              color: COLORS.primaryLight,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
              opacity: titleSpring,
            }}
          >
            Primary Output
          </p>
          <h2
            style={{
              fontSize: 40,
              color: COLORS.text,
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              opacity: titleSpring,
            }}
          >
            Questions to{" "}
            <span style={{ color: COLORS.primaryLight }}>Ask Your Doctor</span>
          </h2>
          <p
            style={{
              fontSize: 18,
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
              marginTop: 8,
              opacity: subtitleSpring,
            }}
          >
            Not answers. Not diagnoses. Informed questions grounded in evidence.
          </p>
        </div>

        {/* Question cards */}
        <div
          style={{
            padding: "24px 28px",
            backgroundColor: `${COLORS.primaryLight}08`,
            border: `1px solid ${COLORS.primaryLight}20`,
            borderRadius: 14,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {QUESTIONS.map((q) => {
              const cardSpring = spring({
                frame: frame - q.delay,
                fps,
                config: { damping: 20, stiffness: 80 },
              });
              const cardX = interpolate(cardSpring, [0, 1], [40, 0]);

              return (
                <div
                  key={q.num}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    opacity: cardSpring,
                    transform: `translateX(${cardX}px)`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      color: COLORS.primaryLight,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {q.num}.
                  </span>
                  <span
                    style={{
                      fontSize: 20,
                      color: COLORS.text,
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 500,
                      lineHeight: 1.4,
                    }}
                  >
                    {q.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* + more */}
          <p
            style={{
              fontSize: 14,
              color: COLORS.textDim,
              fontFamily: "Inter, sans-serif",
              marginTop: 16,
              marginLeft: 28,
              opacity: spring({ frame: frame - 100, fps, config: { damping: 30 } }),
            }}
          >
            + 3 more questions with clinical reasoning...
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
}
