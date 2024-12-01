import { useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { HexCell } from "../../lib/HexCell";
import { HexMetrics } from "../../lib/HexMetrics";
import * as THREE from "three";
import { Water } from "./Water";
import React from "react";
import { useGameStore } from "../../store/gameStore";

interface HexGridProps {}

export function HexGrid({}: HexGridProps) {
  const hexGrid = useGameStore((state) => state.hexGrid);
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    hexGrid.cells.forEach((cell, i) => {
      if (!cell.stateInfo) {
        return;
      }

      const center = getCellCenter(cell);
      const baseVertex = vertices.length / 3;
      const color = new THREE.Color(cell.color);

      // Add center vertex
      vertices.push(center[0], center[1], center[2]);
      colors.push(color.r, color.g, color.b);

      // Add vertices for corners
      for (let d = 0; d < 6; d++) {
        const corner = HexMetrics.getFirstCorner(d);
        vertices.push(
          center[0] + corner[0],
          center[1] + corner[1],
          center[2] + corner[2]
        );
        colors.push(color.r, color.g, color.b);
      }

      // Add triangles
      for (let d = 0; d < 6; d++) {
        indices.push(
          baseVertex,
          baseVertex + d + 1,
          baseVertex + ((d + 1) % 6) + 1
        );
      }
    });

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, [hexGrid.cells]);

  return (
    <>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors />
      </mesh>
    </>
  );
}

function getCellCenter(cell: HexCell): [number, number, number] {
  const x =
    (cell.coordinates.X + cell.coordinates.Z * 0.5) *
    (HexMetrics.innerRadius * 2);
  const y = cell.elevation * HexMetrics.elevationStep;
  const z = cell.coordinates.Z * (HexMetrics.outerRadius * 1.5);
  return [x, y, z];
}
