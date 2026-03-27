import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, GLASS } from "../constants";

export function Scene08DualMode() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 30 } });

  // Toggle animation — switches at midpoint
  const toggleProgress = interpolate(frame, [30, 90], [0, 1], { extrapolateRight: "clamp" });
  const isPatient = toggleProgress < 0.5;

  const patientOpacity = interpolate(toggleProgress, [0, 0.4, 0.6, 1], [1, 1, 0.3, 0.3]);
  const clinicianOpacity = interpolate(toggleProgress, [0, 0.4, 0.6, 1], [0.3, 0.3, 1, 1]);

  const toggleX = interpolate(toggleProgress, [0, 0.4, 0.6, 1], [0, 0, 120, 120]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 900 }}>
        <h2
          style={{
            fontSize: 40,
            color: COLORS.text,
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            marginBottom: 12,
            opacity: titleSpring,
          }}
        >
          Two modes. Same intelligence.
        </h2>

        {/* Toggle bar */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: COLORS.surface,
            border: `1px solid ${COLORS.borderLight}`,
            borderRadius: 10,
            padding: 4,
            marginBottom: 40,
            position: "relative",
          }}
        >
          {/* Slider */}
          <div
            style={{
              position: "absolute",
              left: 4 + toggleX,
              width: 120,
              height: 40,
              borderRadius: 8,
              backgroundColor: isPatient ? COLORS.primary : COLORS.blue,
              transition: "background-color 0.3s",
            }}
          />
          <span
            style={{
              position: "relative",
              padding: "8px 24px",
              fontSize: 16,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              color: isPatient ? COLORS.white : COLORS.textMuted,
              width: 120,
              textAlign: "center",
            }}
          >
            Patient
          </span>
          <span
            style={{
              position: "relative",
              padding: "8px 24px",
              fontSize: 16,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              color: !isPatient ? COLORS.white : COLORS.textMuted,
              width: 120,
              textAlign: "center",
            }}
          >
            Clinician
          </span>
        </div>

        {/* Content cards */}
        <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
          {/* Patient card */}
          <div
            style={{
              flex: 1,
              maxWidth: 400,
              padding: "24px 28px",
              backgroundColor: GLASS.bg,
              border: `1px solid ${COLORS.primary}30`,
              borderRadius: 12,
              opacity: patientOpacity,
              textAlign: "left",
            }}
          >
            <p style={{ fontSize: 12, color: COLORS.primary, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Patient View
            </p>
            <p style={{ fontSize: 18, color: COLORS.text, fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
              &ldquo;Your cholesterol balance needs attention. Your &apos;bad&apos; cholesterol is 151 which is high...&rdquo;
            </p>
          </div>

          {/* Clinician card */}
          <div
            style={{
              flex: 1,
              maxWidth: 400,
              padding: "24px 28px",
              backgroundColor: GLASS.bg,
              border: `1px solid ${COLORS.blue}30`,
              borderRadius: 12,
              opacity: clinicianOpacity,
              textAlign: "left",
            }}
          >
            <p style={{ fontSize: 12, color: COLORS.blue, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Clinician View
            </p>
            <p style={{ fontSize: 18, color: COLORS.text, fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
              &ldquo;Atherogenic dyslipidemia pattern. LDL 151 mg/dL with HDL 36 mg/dL and hs-CRP 5.8 mg/L...&rdquo;
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
