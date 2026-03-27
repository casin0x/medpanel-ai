import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

export function Scene10CTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 60 } });
  const taglineOpacity = spring({ frame: frame - 40, fps, config: { damping: 30 } });
  const urlOpacity = spring({ frame: frame - 70, fps, config: { damping: 30 } });
  const emailOpacity = spring({ frame: frame - 100, fps, config: { damping: 30 } });

  const pulseOpacity = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.03, 0.1]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}${Math.round(pulseOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          filter: "blur(100px)",
        }}
      />

      <div style={{ textAlign: "center", position: "relative" }}>
        {/* Logo */}
        <h1
          style={{
            fontSize: 72,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: "-0.02em",
            opacity: interpolate(logoScale, [0, 1], [0, 1]),
            transform: `scale(${logoScale})`,
          }}
        >
          Med<span style={{ color: COLORS.primaryLight }}>Panel</span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: 26,
            color: COLORS.textMuted,
            fontFamily: "Inter, sans-serif",
            marginTop: 16,
            opacity: taglineOpacity,
          }}
        >
          Cross-specialty perspectives in minutes
        </p>

        {/* URL */}
        <p
          style={{
            fontSize: 22,
            fontFamily: "'JetBrains Mono', monospace",
            color: COLORS.primaryLight,
            marginTop: 40,
            opacity: urlOpacity,
          }}
        >
          medpanel.ai
        </p>

        {/* Contact */}
        <p
          style={{
            fontSize: 16,
            color: COLORS.textDim,
            fontFamily: "Inter, sans-serif",
            marginTop: 16,
            opacity: emailOpacity,
          }}
        >
          invest@medpanel.ai
        </p>
      </div>
    </AbsoluteFill>
  );
}
