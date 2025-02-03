import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  DotScreen,
  Scanline,
} from "@react-three/postprocessing";
import { KernelSize, BlendFunction } from "postprocessing";

import { CameraController } from "./CameraController";
import { HexGrid } from "./HexGrid/HexGrid";
import { WATER_COLORS } from "@/lib/palette";

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
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <HexGrid />
      <EffectComposer>
        <Bloom
          intensity={0.15}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.4}
          kernelSize={KernelSize.SMALL}
        />
        <Scanline
          blendFunction={BlendFunction.OVERLAY} // blend mode
          density={1.25} // scanline density
          opacity={0.1}
        />
      </EffectComposer>
    </Canvas>
  );
}
