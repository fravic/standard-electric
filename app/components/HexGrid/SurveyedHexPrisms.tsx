import * as THREE from "three";
import React, { useMemo, useRef, useEffect } from "react";
import { HexCell } from "@/lib/HexCell";
import { HexMetrics } from "@/lib/HexMetrics";
import { coordinatesToString, toWorldPoint } from "@/lib/coordinates/HexCoordinates";

interface SurveyedHexPrismsProps {
  cells: HexCell[];
  surveyedHexCoords: Set<string>;
}

// Helper function to get terrain visual properties
function getTerrainProperties(terrainType: string) {
  const properties: Record<string, any> = {
    plains: {
      color: "#8BC34A", // Light green
    },
    forest: {
      color: "#2E7D32", // Dark green
    },
    desert: {
      color: "#FBC02D", // Sand yellow
    },
    mountains: {
      color: "#757575", // Mountain gray
    },
    hills: {
      color: "#A5D6A7", // Light green with brown
    },
    tundra: {
      color: "#E0E0E0", // Off-white
    },
    water: {
      color: "#1976D2", // Blue
    },
    default: {
      color: "#8FBC8F", // Default green
    },
  };

  return properties[terrainType] || properties.default;
}

// Constants for all hex prisms
const HEX_HEIGHT = 0.1; // Uniform height for all hex tiles

export function SurveyedHexPrisms({ cells, surveyedHexCoords }: SurveyedHexPrismsProps) {
  // Filter only surveyed cells
  const surveyedCells = useMemo(() => {
    return cells.filter((cell) => surveyedHexCoords.has(coordinatesToString(cell.coordinates)));
  }, [cells, surveyedHexCoords]);

  // Group cells by terrain type for efficient rendering
  const cellsByTerrainType = useMemo(() => {
    const grouped: Record<string, HexCell[]> = {};

    surveyedCells.forEach((cell) => {
      const terrainType = cell.terrainType || "default";
      if (!grouped[terrainType]) grouped[terrainType] = [];
      grouped[terrainType].push(cell);
    });

    return grouped;
  }, [surveyedCells]);

  // Create geometry for a single hex prism
  const hexPrismGeometry = useMemo(() => {
    // Create a hexagonal shape using HexMetrics
    const shape = new THREE.Shape();
    const outerRadius = HexMetrics.outerRadius * 0.92; // Slightly smaller to avoid overlap

    // Add the 6 points of the hexagon - offset by 30 degrees to align with grid
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6; // Add 30 degree offset
      const x = outerRadius * Math.cos(angle);
      const z = outerRadius * Math.sin(angle);

      if (i === 0) {
        shape.moveTo(x, z);
      } else {
        shape.lineTo(x, z);
      }
    }
    shape.closePath();

    // Extrude to create 3D prism with a slight bevel
    const extrudeSettings = {
      depth: 1.0, // Base height of the prism (will be scaled)
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelOffset: 0,
      bevelSegments: 1,
    };

    // Create extruded geometry and rotate it so it's oriented correctly in world space
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // By default, THREE.ExtrudeGeometry extrudes along the Z axis
    // We rotate it so the extrusion is along the Y axis (upward)
    geometry.rotateX(-Math.PI / 2);

    return geometry;
  }, []);

  // Store refs to all instanced meshes
  const instanceRefs = useRef<Record<string, React.RefObject<THREE.InstancedMesh>>>({});

  // Initialize refs for each terrain type
  useMemo(() => {
    Object.keys(cellsByTerrainType).forEach((terrainType) => {
      if (!instanceRefs.current[terrainType]) {
        instanceRefs.current[terrainType] = React.createRef();
      }
    });
  }, [cellsByTerrainType]);

  // Initialize matrices when cells change
  useEffect(() => {
    Object.entries(cellsByTerrainType).forEach(([terrainType, cells]) => {
      const meshRef = instanceRefs.current[terrainType];
      if (meshRef && meshRef.current) {
        initializeMatrices(meshRef, cells);
      }
    });
  }, [cellsByTerrainType]);

  // Initialize matrices for all instances
  function initializeMatrices(meshRef: React.RefObject<THREE.InstancedMesh>, cells: HexCell[]) {
    if (!meshRef.current || cells.length === 0) return;

    const mesh = meshRef.current;
    const matrix = new THREE.Matrix4();

    cells.forEach((cell, i) => {
      const [x, y, z] = toWorldPoint(cell.coordinates);

      // Position and scale the hex
      matrix.identity();
      // Position at cell center, slightly above ground to prevent z-fighting
      matrix.makeTranslation(x, 0.01, z);

      // Scale for uniform height
      matrix.scale(new THREE.Vector3(1, HEX_HEIGHT, 1));

      mesh.setMatrixAt(i, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }

  return (
    <group>
      {Object.entries(cellsByTerrainType).map(([terrainType, terrainCells]) => {
        const terrainProps = getTerrainProperties(terrainType);

        return (
          <instancedMesh
            key={terrainType}
            ref={instanceRefs.current[terrainType]}
            args={[hexPrismGeometry, undefined, terrainCells.length]}
            frustumCulled={false} // Prevent disappearing when zooming
          >
            <meshStandardMaterial
              color={terrainProps.color}
              roughness={0.7}
              metalness={0.1}
              depthWrite={true}
              transparent={false}
              flatShading={false}
            />
          </instancedMesh>
        );
      })}
    </group>
  );
}
