import { AbsoluteFill, Sequence } from "remotion";
import { COLORS, SCENES, FPS } from "./constants";
import { Scene01Hook } from "./scenes/Scene01Hook";
import { Scene02Problem } from "./scenes/Scene02Problem";
import { Scene03ProductIntro } from "./scenes/Scene03ProductIntro";
import { Scene04HowItWorks } from "./scenes/Scene04HowItWorks";
import { Scene05MagicMoment } from "./scenes/Scene05MagicMoment";
import { Scene06DualMode } from "./scenes/Scene06DualMode";
import { Scene07Evidence } from "./scenes/Scene07Evidence";
import { Scene08CTA } from "./scenes/Scene08CTA";

const SCENE_COMPONENTS = [
  Scene01Hook,
  Scene02Problem,
  Scene03ProductIntro,
  Scene04HowItWorks,
  Scene05MagicMoment,
  Scene06DualMode,
  Scene07Evidence,
  Scene08CTA,
];

export function MedPanelExplainer() {
  let offset = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {SCENES.map((scene, i) => {
        const Component = SCENE_COMPONENTS[i];
        const durationInFrames = scene.duration * FPS;
        const from = offset;
        offset += durationInFrames;

        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={durationInFrames}
            name={scene.id}
          >
            <Component />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
