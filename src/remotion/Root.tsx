import { Composition } from "remotion";
import { MedPanelExplainer } from "./MedPanelExplainer";
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from "./constants";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="MedPanelExplainer"
        component={MedPanelExplainer}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
    </>
  );
}
