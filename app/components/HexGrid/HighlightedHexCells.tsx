import React, { useMemo } from "react";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";
import { HexCell, getCenterPoint } from "@/lib/HexCell";
import { HexMesh } from "@/lib/HexMesh";
import { HexMetrics } from "@/lib/HexMetrics";

interface HighlightedHexCellsProps {
  cells: HexCell[];
  color?: THREE.Color | [number, number, number];
  opacity?: number;
  height?: number;
}

export const HighlightedHexCells: React.FC<HighlightedHexCellsProps> = ({
  cells,
  color = [1, 1, 1], // Default to white
  opacity = 0.05,
  height = 0.1, // Default to slightly above the terrain
}) => {
  const { highlightGeometry } = useMemo(() => {
    const hexMesh = new HexMesh();
    const colorObj = Array.isArray(color)
      ? new THREE.Color(color[0], color[1], color[2])
      : color;

    cells.forEach((cell) => {
      const center = getCenterPoint(cell);
      // Raise the highlight slightly above the terrain
      const raisedCenter = [center[0], center[1] + height, center[2]] as const;

      // Create a hexagon for each cell
      for (let d = 0; d < 6; d++) {
        hexMesh.addTriangle(
          raisedCenter,
          [
            HexMetrics.getFirstCorner(center, d)[0],
            center[1] + height,
            HexMetrics.getFirstCorner(center, d)[2],
          ],
          [
            HexMetrics.getSecondCorner(center, d)[0],
            center[1] + height,
            HexMetrics.getSecondCorner(center, d)[2],
          ],
          colorObj
        );
      }
    });

    const highlightGeometry = new THREE.BufferGeometry();
    highlightGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(hexMesh.vertices, 3)
    );
    highlightGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(hexMesh.colors, 3)
    );
    highlightGeometry.setIndex(hexMesh.indices);
    highlightGeometry.computeVertexNormals();

    return { highlightGeometry };
  }, [cells, color, height]);

  // Animate the opacity
  const springs = useSpring({
    opacity: cells.length > 0 ? opacity : 0,
    config: { duration: 300 }, // 300ms fade duration
  });

  return (
    <animated.mesh geometry={highlightGeometry} raycast={null}>
      <animated.meshBasicMaterial
        vertexColors
        transparent
        opacity={springs.opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </animated.mesh>
  );
};
