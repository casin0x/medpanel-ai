import { AbsoluteFill, Sequence } from "remotion";
import { COLORS, SCENES, FPS } from "./constants";
import { Scene01Hook } from "./scenes/Scene01Hook";
import { Scene02Problem } from "./scenes/Scene02Problem";
import { Scene03ProductIntro } from "./scenes/Scene03ProductIntro";
import { Scene04HowItWorks } from "./scenes/Scene04HowItWorks";
import { Scene05Consensus } from "./scenes/Scene05Consensus";
import { Scene06Disagreements } from "./scenes/Scene06Disagreements";
import { Scene07Questions } from "./scenes/Scene07Questions";
import { Scene08DualMode } from "./scenes/Scene08DualMode";
import { Scene09Evidence } from "./scenes/Scene09Evidence";
import { Scene10CTA } from "./scenes/Scene10CTA";

const SCENE_COMPONENTS = [
  Scene01Hook,
  Scene02Problem,
  Scene03ProductIntro,
  Scene04HowItWorks,
  Scene05Consensus,
  Scene06Disagreements,
  Scene07Questions,
  Scene08DualMode,
  Scene09Evidence,
  Scene10CTA,
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
