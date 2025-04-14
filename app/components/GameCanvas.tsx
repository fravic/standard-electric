import { OrbitControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, DotScreen, Scanline } from "@react-three/postprocessing";
import { KernelSize, BlendFunction } from "postprocessing";

import { CameraController } from "./CameraController";
import { HexGrid } from "./HexGrid/HexGrid";
import { WATER_COLORS } from "@/lib/palette";
import { ShiftingBackground } from "./ShiftingBackground";
import { GameContext } from "@/actor/game.context";
import { ticksToHour } from "@/lib/time";

export function GameCanvas() {
  // Get the current game time for day/night transitions
  const { totalTicks } = GameContext.useSelector(
    (state: { public: { time: { totalTicks: number } } }) => state.public.time
  );

  // Convert ticks to hour for the ShiftingBackground
  const hour = ticksToHour(totalTicks);

  return (
    <Canvas
      style={{
        width: "100%",
        height: "100%",
      }}
      camera={{
        position: [0, 5, 5],
        fov: 75,
      }}
    >
      <color attach="background" args={[WATER_COLORS.BACKGROUND]} />
      <OrbitControls makeDefault />
      <CameraController />
      <directionalLight position={[-5, 5, -2]} intensity={1} />
      <ambientLight intensity={2} />
      <ShiftingBackground hour={hour} />
      <HexGrid />
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          kernelSize={KernelSize.MEDIUM}
        />
        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.25} opacity={0.1} />
      </EffectComposer>
    </Canvas>
  );
}
