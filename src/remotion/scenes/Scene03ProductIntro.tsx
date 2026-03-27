import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

export function Scene03ProductIntro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo reveal
  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 60 } });
  const logoOpacity = interpolate(logoScale, [0, 1], [0, 1]);

  // Tagline
  const taglineOpacity = spring({ frame: frame - 50, fps, config: { damping: 30 } });
  const taglineY = interpolate(taglineOpacity, [0, 1], [20, 0]);

  // Stats bar
  const statsOpacity = spring({ frame: frame - 90, fps, config: { damping: 30 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 400,
          background: `radial-gradient(ellipse, ${COLORS.primaryDim}40 0%, transparent 70%)`,
          filter: "blur(100px)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 80,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: "-0.02em",
          }}
        >
          Med<span style={{ color: COLORS.primaryLight }}>Panel</span>
        </h1>
      </div>

      {/* Tagline */}
      <p
        style={{
          fontSize: 30,
          color: COLORS.textMuted,
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          marginTop: 16,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          textAlign: "center",
        }}
      >
        A virtual case conference for every clinical question
      </p>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 48,
          marginTop: 60,
          opacity: statsOpacity,
        }}
      >
        {[
          { value: "3-5", label: "Specialists" },
          { value: "2 min", label: "Per Consult" },
          { value: "PubMed", label: "Grounded" },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: 36,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                color: COLORS.primaryLight,
              }}
            >
              {s.value}
            </p>
            <p
              style={{
                fontSize: 16,
                color: COLORS.textDim,
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginTop: 4,
              }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
