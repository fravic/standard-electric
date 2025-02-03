import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";

import { CameraController } from "./CameraController";
import { HexGrid } from "./HexGrid/HexGrid";

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
      <color attach="background" args={["#c1e4ff"]} />
      <OrbitControls makeDefault />
      <CameraController />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <HexGrid />
      <EffectComposer>
        <Bloom
          intensity={0.2}
          luminanceThreshold={0.7}
          luminanceSmoothing={0.4}
          kernelSize={KernelSize.SMALL}
        />
      </EffectComposer>
    </Canvas>
  );
}
