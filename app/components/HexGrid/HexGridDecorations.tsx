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
import { GameContext } from "@/actor/game.context";
import { isNightTime } from "@/lib/time";
import { BUILDING_COLORS, NATURE_COLORS } from "@/lib/palette";

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
        <meshStandardMaterial color={NATURE_COLORS.TREE_TRUNK} />
      </mesh>
      {/* Leaves */}
      <mesh position={[0, trunkHeight + leavesRadius * 0.7, 0]}>
        <coneGeometry args={[leavesRadius, treeHeight, 5]} />
        <meshStandardMaterial color={NATURE_COLORS.TREE_LEAVES} />
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
  const { totalTicks } = GameContext.useSelector((state) => state.public.time);
  const isNight = isNightTime(totalTicks);

  // Use seed to generate consistent random variations
  const rng = seedrandom(`${seed}`);
  const randomScale = 0.8 + rng() * 0.4; // 0.8-1.2 scale variation

  const getSize = () => {
    switch (population) {
      case Population.Village:
        return { width: 0.1, height: 0.2 };
      case Population.Town:
        return { width: 0.12, height: 0.3 };
      case Population.City:
        return { width: 0.15, height: 0.5 };
      case Population.Metropolis:
        return { width: 0.18, height: 0.7 };
      case Population.Megalopolis:
        return { width: 0.2, height: 1.0 };
      default:
        return { width: 0, height: 0 };
    }
  };

  const { width, height } = getSize();
  if (height === 0) return null;

  // Apply random scale to add variety while keeping it consistent
  const scaledWidth = width * randomScale;
  const scaledHeight = height * randomScale;

  // Create window texture for walls
  const textureSize = 128;
  const canvas = document.createElement("canvas");
  canvas.width = textureSize;
  canvas.height = textureSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fill background color (building wall)
  ctx.fillStyle = BUILDING_COLORS.WALL;
  ctx.fillRect(0, 0, textureSize, textureSize);

  // Calculate window parameters
  const windowRows = 3;
  const windowCols = 2;
  const windowMargin = textureSize * 0.15;
  const windowWidth = (textureSize - windowMargin * 3) / windowCols;
  const windowHeight =
    (textureSize - windowMargin * (windowRows + 1)) / windowRows;

  // Draw windows
  ctx.fillStyle = isNight
    ? BUILDING_COLORS.WINDOW_NIGHT
    : BUILDING_COLORS.WINDOW_DAY;
  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const windowRng = seedrandom(`${seed}-window-${row}-${col}`);
      if (windowRng() > 0.3) {
        // 70% chance for a window
        const x = windowMargin + col * (windowWidth + windowMargin);
        const y = windowMargin + row * (windowHeight + windowMargin);
        ctx.fillRect(x, y, windowWidth, windowHeight);
      }
    }
  }

  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas);
  texture.repeat.set(1, Math.ceil(scaledHeight / scaledWidth));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return (
    <group position={position}>
      {/* Main building walls */}
      <mesh position={[0, scaledHeight / 2, 0]}>
        <boxGeometry args={[scaledWidth, scaledHeight, scaledWidth]} />
        <meshStandardMaterial
          color={BUILDING_COLORS.BASE}
          map={texture}
          emissiveMap={texture}
          emissiveIntensity={isNight ? 2.0 : 0}
          toneMapped={false}
        />
      </mesh>
      {/* Roof */}
      <mesh position={[0, scaledHeight + 0.02, 0]}>
        <boxGeometry args={[scaledWidth * 1.1, 0.04, scaledWidth * 1.1]} />
        <meshStandardMaterial color={BUILDING_COLORS.ROOF} roughness={0.7} />
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
