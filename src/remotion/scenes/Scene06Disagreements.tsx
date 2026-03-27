import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, SPECIALIST_COLORS, GLASS } from "../constants";

const SPECIALISTS = [
  {
    name: "Cardiologist",
    position: "argues against berberine",
    detail: "Cardiac risk profile needs stabilizing first",
    colors: SPECIALIST_COLORS.cardiologist,
    delay: 30,
  },
  {
    name: "Nephrologist",
    position: "berberine contraindicated at this GFR",
    detail: "eGFR 68\u219261 in 6 months is a dangerous slope",
    colors: SPECIALIST_COLORS.nephrologist,
    delay: 60,
  },
  {
    name: "Functional Medicine",
    position: "address root cause first",
    detail: "Insulin resistance, not supplements",
    colors: SPECIALIST_COLORS.functional_medicine,
    delay: 90,
  },
];

export function Scene06Disagreements() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 30 } });
  const disagreementSpring = spring({ frame: frame - 15, fps, config: { damping: 25 } });

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
        <div style={{ textAlign: "center", marginBottom: 40, opacity: titleSpring }}>
          <p
            style={{
              fontSize: 14,
              color: COLORS.amber,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
            }}
          >
            Panel Disagreement
          </p>
          <h2
            style={{
              fontSize: 38,
              color: COLORS.text,
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
            }}
          >
            3 specialists.{" "}
            <span style={{ color: COLORS.amber }}>They disagree.</span>
          </h2>
          <p
            style={{
              fontSize: 20,
              color: COLORS.textMuted,
              fontFamily: "Inter, sans-serif",
              marginTop: 8,
              opacity: disagreementSpring,
            }}
          >
            That&apos;s the point. Real medicine has disagreements.
          </p>
        </div>

        {/* Specialist cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SPECIALISTS.map((spec) => {
            const cardSpring = spring({
              frame: frame - spec.delay,
              fps,
              config: { damping: 18, stiffness: 70 },
            });
            const cardX = interpolate(cardSpring, [0, 1], [80, 0]);

            return (
              <div
                key={spec.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "20px 24px",
                  backgroundColor: GLASS.bg,
                  border: `1px solid ${GLASS.border}`,
                  borderLeft: `3px solid ${spec.colors.text}`,
                  borderRadius: 12,
                  opacity: cardSpring,
                  transform: `translateX(${cardX}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 600,
                      color: spec.colors.text,
                      backgroundColor: spec.colors.bg,
                      border: `1px solid ${spec.colors.border}`,
                      padding: "3px 10px",
                      borderRadius: 4,
                    }}
                  >
                    {spec.name}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 22,
                    color: COLORS.text,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {spec.position}
                </p>
                <p
                  style={{
                    fontSize: 16,
                    color: COLORS.textMuted,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {spec.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
