import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, GLASS } from "../constants";

const CITATIONS = [
  { claim: "SGLT2i renal protection", source: "DAPA-CKD Trial", pmid: "32970396", tier: "Strong", tierColor: COLORS.primaryLight, delay: 20 },
  { claim: "Berberine AMPK activation in T2D", source: "RCT, Metabolism, 2020", pmid: "32446903", tier: "Moderate", tierColor: COLORS.blue, delay: 40 },
  { claim: "ApoB superior to LDL-C for CV risk", source: "ESC/EAS Guidelines, 2019", pmid: "31504429", tier: "Strong", tierColor: COLORS.primaryLight, delay: 60 },
  { claim: "Berberine renal safety in CKD 3", source: "Observational, 2021", pmid: "33476817", tier: "Preliminary", tierColor: COLORS.amber, delay: 80 },
];

export function Scene09Evidence() {
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
        <h2
          style={{
            fontSize: 40,
            color: COLORS.text,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            marginBottom: 12,
            opacity: titleSpring,
            textAlign: "center",
          }}
        >
          Every claim{" "}
          <span style={{ color: COLORS.primaryLight }}>grounded in PubMed</span>
        </h2>
        <p
          style={{
            fontSize: 20,
            color: COLORS.textDim,
            fontFamily: "Inter, sans-serif",
            textAlign: "center",
            marginBottom: 40,
            opacity: titleSpring,
          }}
        >
          Real PMIDs. Verifiable citations. Tiered by evidence strength.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CITATIONS.map((c) => {
            const cardSpring = spring({
              frame: frame - c.delay,
              fps,
              config: { damping: 20, stiffness: 80 },
            });
            const cardY = interpolate(cardSpring, [0, 1], [30, 0]);

            return (
              <div
                key={c.pmid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 24px",
                  backgroundColor: GLASS.bg,
                  border: `1px solid ${GLASS.border}`,
                  borderRadius: 10,
                  opacity: cardSpring,
                  transform: `translateY(${cardY}px)`,
                }}
              >
                {/* Tier badge */}
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    color: c.tierColor,
                    backgroundColor: `${c.tierColor}15`,
                    padding: "4px 10px",
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  {c.tier}
                </span>

                {/* Claim */}
                <span
                  style={{
                    flex: 1,
                    fontSize: 18,
                    color: COLORS.text,
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {c.claim}
                </span>

                {/* PMID */}
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: COLORS.blue,
                    flexShrink: 0,
                  }}
                >
                  PMID:{c.pmid}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
