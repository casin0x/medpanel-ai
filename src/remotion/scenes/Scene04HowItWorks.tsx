import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, GLASS } from "../constants";

const STEPS = [
  { num: "1", title: "Patient asks", desc: "A health question with their full profile", color: COLORS.primaryLight, delay: 0 },
  { num: "2", title: "AI classifies", desc: "Detects domains, urgency, complexity", color: "#3b82f6", delay: 40 },
  { num: "3", title: "Specialists analyze", desc: "Each works independently — no groupthink", color: COLORS.primaryLight, delay: 80 },
  { num: "4", title: "Cross-examination", desc: "Specialists challenge each other's findings", color: "#f59e0b", delay: 120 },
  { num: "5", title: "Structured output", desc: "Consensus, disagreements, questions for your doctor", color: COLORS.primaryLight, delay: 160 },
];

export function Scene04HowItWorks() {
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
        <h2
          style={{
            fontSize: 40,
            color: COLORS.text,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            marginBottom: 16,
            opacity: titleOpacity,
            textAlign: "center",
          }}
        >
          How it works
        </h2>
        <p
          style={{
            fontSize: 20,
            color: COLORS.textDim,
            fontFamily: "Inter, sans-serif",
            textAlign: "center",
            marginBottom: 50,
            opacity: titleOpacity,
          }}
        >
          Clinical case conference protocol — automated
        </p>

        {/* Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
          {STEPS.map((step, i) => {
            const stepSpring = spring({
              frame: frame - 20 - step.delay,
              fps,
              config: { damping: 20, stiffness: 80 },
            });
            const stepX = interpolate(stepSpring, [0, 1], [-40, 0]);

            return (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 24,
                  opacity: stepSpring,
                  transform: `translateX(${stepX}px)`,
                  paddingBottom: i < STEPS.length - 1 ? 20 : 0,
                }}
              >
                {/* Number circle + line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      border: `2px solid ${COLORS.surfaceLight}`,
                      backgroundColor: COLORS.surface,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      color: step.color,
                      flexShrink: 0,
                    }}
                  >
                    {step.num}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        width: 2,
                        height: 20,
                        backgroundColor: COLORS.surfaceLight,
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div style={{ paddingTop: 8 }}>
                  <p
                    style={{
                      fontSize: 24,
                      color: COLORS.text,
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {step.title}
                  </p>
                  <p
                    style={{
                      fontSize: 18,
                      color: COLORS.textMuted,
                      fontFamily: "Inter, sans-serif",
                      marginTop: 4,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
