import { OrbitControls, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, DotScreen, Scanline } from "@react-three/postprocessing";
import { KernelSize, BlendFunction } from "postprocessing";

import { CameraController } from "./CameraController";
import { HexGrid } from "./HexGrid/HexGrid";
import { WATER_COLORS } from "@/lib/palette";
import { ShiftingBackground } from "./ShiftingBackground";

export function GameCanvas() {
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
      <ambientLight intensity={3} />
      <ShiftingBackground />
      <HexGrid />
      <EffectComposer>
        <Bloom
          intensity={0.15}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.4}
          kernelSize={KernelSize.SMALL}
        />
        <Scanline blendFunction={BlendFunction.OVERLAY} density={1.25} opacity={0.1} />
      </EffectComposer>
    </Canvas>
  );
}
