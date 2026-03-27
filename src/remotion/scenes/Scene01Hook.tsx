import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

export function Scene01Hook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulseOpacity = interpolate(
    Math.sin(frame * 0.1),
    [-1, 1],
    [0.02, 0.08]
  );

  const textOpacity = spring({ frame: frame - 20, fps, config: { damping: 30 } });
  const textY = interpolate(textOpacity, [0, 1], [30, 0]);

  const questionOpacity = spring({ frame: frame - 50, fps, config: { damping: 30 } });
  const questionY = interpolate(questionOpacity, [0, 1], [20, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Emerald pulse glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}${Math.round(pulseOpacity * 255).toString(16).padStart(2, "0")} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />

      {/* Main question */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textAlign: "center",
          maxWidth: 1000,
          padding: "0 60px",
        }}
      >
        <p
          style={{
            fontSize: 28,
            color: COLORS.primaryLight,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          What if...
        </p>
        <h1
          style={{
            fontSize: 52,
            color: COLORS.text,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            lineHeight: 1.2,
            opacity: questionOpacity,
            transform: `translateY(${questionY}px)`,
          }}
        >
          You could get a{" "}
          <span style={{ color: COLORS.primaryLight }}>second opinion panel</span>
          <br />
          in 2 minutes?
        </h1>
      </div>
    </AbsoluteFill>
  );
}
