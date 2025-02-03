import React, { useMemo } from "react";
import * as THREE from "three";
import seedrandom from "seedrandom";
import {
  HexCell,
  Population,
  TerrainType,
  getCenterPoint,
} from "@/lib/HexCell";
import { HexMetrics } from "@/lib/HexMetrics";
import { Vertex } from "@/lib/types";

interface HexGridDecorationsProps {
  cells: HexCell[];
}

// Helper to get random position within hex bounds
function getRandomPositionInHex(
  center: Vertex,
  radius: number = HexMetrics.outerRadius * 0.8,
  seed: number
): THREE.Vector3 {
  // Use the seed to generate a consistent random position
  const rng = seedrandom(`${seed}`);
  const angle = rng() * Math.PI * 2;
  const r = Math.sqrt(rng()) * radius; // sqrt for uniform distribution
  return new THREE.Vector3(
    center[0] + r * Math.cos(angle),
    center[1],
    center[2] + r * Math.sin(angle)
  );
}

// Tree component using basic shapes
const Tree: React.FC<{ position: THREE.Vector3; seed: number }> = ({
  position,
  seed,
}) => {
  // Use seed to generate consistent height
  const rng = seedrandom(`${seed}`);
  const treeHeight = 0.2 + rng() * 0.2;
  const trunkHeight = treeHeight * 0.3;
  const trunkRadius = 0.02;
  const leavesRadius = 0.15;

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[trunkRadius, trunkRadius, trunkHeight, 6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Leaves */}
      <mesh position={[0, trunkHeight + leavesRadius * 0.7, 0]}>
        <coneGeometry args={[leavesRadius, treeHeight, 5]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </group>
  );
};

// Building component with different sizes based on population
const Building: React.FC<{
  position: THREE.Vector3;
  population: Population;
  seed: number;
}> = ({ position, population, seed }) => {
  // Use seed to generate consistent random variations
  const rng = seedrandom(`${seed}`);
  const randomScale = 0.8 + rng() * 0.4; // 0.8-1.2 scale variation

  const getSize = () => {
    switch (population) {
      case Population.Village:
        return { width: 0.1, height: 0.2 }; // Reduced from 0.4/0.8
      case Population.Town:
        return { width: 0.12, height: 0.3 }; // Reduced from 0.5/1.2
      case Population.City:
        return { width: 0.15, height: 0.5 }; // Reduced from 0.6/2.0
      case Population.Metropolis:
        return { width: 0.18, height: 0.7 }; // Reduced from 0.7/3.0
      case Population.Megalopolis:
        return { width: 0.2, height: 1.0 }; // Reduced from 0.8/4.0
      default:
        return { width: 0, height: 0 };
    }
  };

  const { width, height } = getSize();
  if (height === 0) return null;

  // Apply random scale to add variety while keeping it consistent
  const scaledWidth = width * randomScale;
  const scaledHeight = height * randomScale;

  return (
    <group position={position}>
      {/* Main building */}
      <mesh position={[0, scaledHeight / 2, 0]}>
        <boxGeometry args={[scaledWidth, scaledHeight, scaledWidth]} />
        <meshStandardMaterial color="#A0A0A0" />
      </mesh>
    </group>
  );
};

export const HexGridDecorations = React.memo(function HexGridDecorations({
  cells,
}: HexGridDecorationsProps) {
  const decorations = useMemo(() => {
    const items: JSX.Element[] = [];

    cells.forEach((cell) => {
      const center = getCenterPoint(cell);

      // Add trees for forest terrain
      if (cell.terrainType === TerrainType.Forest) {
        // Use a seeded random for consistent number of trees
        const forestRng = seedrandom(
          `forest-${cell.coordinates.x}-${cell.coordinates.z}`
        );
        const numTrees = 5 + Math.floor(forestRng() * 5); // 5-9 trees per forest hex
        for (let i = 0; i < numTrees; i++) {
          // Create a unique but consistent seed for this tree
          const treeSeed = parseInt(
            `${cell.coordinates.x}${cell.coordinates.z}${i}`,
            10
          );
          const treePos = getRandomPositionInHex(
            center,
            HexMetrics.outerRadius * 0.6,
            treeSeed
          );
          items.push(
            <Tree
              key={`tree-${cell.coordinates.x}-${cell.coordinates.z}-${i}`}
              position={treePos}
              seed={treeSeed}
            />
          );
        }
      }

      // Add buildings based on population
      if (cell.population > Population.Unpopulated) {
        const numBuildings = Math.max(
          1,
          Math.floor(Math.log2(cell.population + 1) * 2)
        );
        for (let i = 0; i < numBuildings; i++) {
          // Create a unique but consistent seed for this building
          const buildingSeed = parseInt(
            `${cell.coordinates.x}${cell.coordinates.z}${i}`,
            10
          );
          const buildingPos = getRandomPositionInHex(
            center,
            HexMetrics.outerRadius * 0.5,
            buildingSeed
          );
          items.push(
            <Building
              key={`building-${cell.coordinates.x}-${cell.coordinates.z}-${i}`}
              position={buildingPos}
              population={cell.population}
              seed={buildingSeed}
            />
          );
        }
      }
    });

    return items;
  }, [cells]);

  return <>{decorations}</>;
});
