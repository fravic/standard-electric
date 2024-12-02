import React from "react";
import { HexGrid } from "./HexGrid/HexGrid";
import { CameraController } from "./CameraController";

export default function Experience(): JSX.Element {
  return (
    <>
      <CameraController />
      <ambientLight intensity={1} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <HexGrid />
    </>
  );
}
