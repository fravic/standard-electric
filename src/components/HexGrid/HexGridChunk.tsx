import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { ThreeEvent, useFrame } from "@react-three/fiber";
import waterVertexShader from "../../shaders/water.vert";
import waterFragmentShader from "../../shaders/water.frag";

import { HexCell } from "../../lib/HexCell";
import { HexMetrics } from "../../lib/HexMetrics";
import { HexCoordinates } from "../../lib/HexCoordinates";
import { HexGridTerrain } from "./HexGridTerrain";
import { HexGridWater } from "./HexGridWater";

interface HexGridChunkProps {
  chunk: HexCell[];
  chunkX: number;
  chunkZ: number;
  onCellClick: (coordinates: HexCoordinates) => void;
}

export function HexGridChunk({
  chunk,
  chunkX,
  chunkZ,
  onCellClick,
}: HexGridChunkProps) {
  return (
    <group>
      <HexGridTerrain chunk={chunk} onClick={onCellClick} />
      <HexGridWater chunk={chunk} />
    </group>
  );
}
