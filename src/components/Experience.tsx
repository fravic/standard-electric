import React from "react";
import { HexGrid } from "./HexGrid";
import { CameraController } from "./CameraController";

export default function Experience(): JSX.Element {
  return (
    <>
      <CameraController />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <HexGrid />
    </>
  );
}
