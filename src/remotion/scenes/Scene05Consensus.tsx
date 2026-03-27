import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, GLASS } from "../constants";

const AGREEMENTS = [
  { text: "Berberine not recommended with eGFR <60 and active decline", votes: "3/3", tier: "Strong", tierColor: COLORS.primaryLight, delay: 20 },
  { text: "SGLT2 inhibitor preferred — dual glucose + renal protection", votes: "3/3", tier: "Strong", tierColor: COLORS.primaryLight, delay: 40 },
  { text: "Serial cystatin C every 3 months to track kidney trajectory", votes: "3/3", tier: "Moderate", tierColor: COLORS.blue, delay: 60 },
];

export function Scene05Consensus() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 30 } });

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
        <div style={{ textAlign: "center", marginBottom: 40, opacity: titleSpring }}>
          <p
            style={{
              fontSize: 14,
              color: COLORS.primaryLight,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
            }}
          >
            Panel Consensus
          </p>
          <h2
            style={{
              fontSize: 40,
              color: COLORS.text,
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
            }}
          >
            Where all specialists{" "}
            <span style={{ color: COLORS.primaryLight }}>agree</span>
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {AGREEMENTS.map((a) => {
            const cardSpring = spring({
              frame: frame - a.delay,
              fps,
              config: { damping: 20, stiffness: 80 },
            });
            const cardY = interpolate(cardSpring, [0, 1], [30, 0]);

            return (
              <div
                key={a.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 24px",
                  backgroundColor: GLASS.bg,
                  border: `1px solid ${COLORS.primaryLight}20`,
                  borderLeft: `3px solid ${COLORS.primaryLight}60`,
                  borderRadius: 12,
                  opacity: cardSpring,
                  transform: `translateY(${cardY}px)`,
                }}
              >
                {/* Check icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.primaryLight} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>

                <span
                  style={{
                    flex: 1,
                    fontSize: 20,
                    color: COLORS.text,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {a.text}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: COLORS.textDim }}>
                    {a.votes}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: a.tierColor,
                      backgroundColor: `${a.tierColor}15`,
                      padding: "3px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {a.tier}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
