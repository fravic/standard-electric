"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import { CameraController } from "./CameraController";

export default function GameCanvas() {
  return (
    <Canvas
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
    </Canvas>
  );
}
