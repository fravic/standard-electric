import React, { useMemo, useEffect, useState } from "react";
import {
  CylinderGeometry,
  Color,
  Vector3,
  DoubleSide,
  BufferGeometry,
  BufferAttribute,
  Matrix4,
} from "three";
import { initializeMapData, getStateInfo } from "../utils/geoUtils";

interface MapConfig {
  PROJECTION_WIDTH: number;
  PROJECTION_HEIGHT: number;
  GRID_WIDTH: number;
  GRID_HEIGHT: number;
  X_OFFSET: number;
  Y_OFFSET: number;
}

interface ColorConfig {
  LAND_BASE: Color;
  SATURATION_RANGE: number;
  LIGHTNESS_RANGE: number;
  WATER: Color;
  WATER_OPACITY: number;
}

interface TerrainTypes {
  PLAINS: {
    baseColor: Color;
    stateColorVariation: number;
    tileVariation: number;
  };
  WATER: {
    baseColor: Color;
    variations: number[];
  };
}

interface HexConfig {
  RADIUS: number;
  WATER_HEIGHT: number;
  LAND_HEIGHT: number;
  WATER_VERTICAL_OFFSET: number;
  SCALE: number;
  VERTICAL_SPACING: number;
  HORIZONTAL_SPACING: number;
}

interface TerrainInfo {
  type: "WATER" | "PLAINS";
  color: Color;
  stateName?: string;
}

interface HexData {
  position: [number, number, number];
  color: Color;
  terrainType: "WATER" | "PLAINS";
  stateName?: string;
  key: string;
}

// Map dimensions and scale
const MAP_CONFIG: MapConfig = {
  PROJECTION_WIDTH: 1200,
  PROJECTION_HEIGHT: 800,
  GRID_WIDTH: 200,
  GRID_HEIGHT: 130,
  X_OFFSET: 120,
  Y_OFFSET: 100,
};

// Color configuration
const COLOR_CONFIG: ColorConfig = {
  LAND_BASE: new Color("#68dba2"),
  SATURATION_RANGE: 0.25,
  LIGHTNESS_RANGE: 0.2,
  WATER: new Color("#5d8bca"),
  WATER_OPACITY: 0.85,
};

// Terrain types configuration
const TERRAIN_TYPES: TerrainTypes = {
  PLAINS: {
    baseColor: COLOR_CONFIG.LAND_BASE,
    stateColorVariation: 0.3,
    tileVariation: 0.05,
  },
  WATER: {
    baseColor: COLOR_CONFIG.WATER,
    variations: [0.95, 0.975, 1, 1.025, 1.05],
  },
};

// Hex geometry configuration
const HEX_CONFIG: HexConfig = {
  RADIUS: 0.3,
  WATER_HEIGHT: 0.1,
  LAND_HEIGHT: 0.2,
  WATER_VERTICAL_OFFSET: 0.15,
  SCALE: 1.01,
  VERTICAL_SPACING: 0.745,
  HORIZONTAL_SPACING: 0.995,
};

export function HexGrid(): JSX.Element | null {
  const [mapDataLoaded, setMapDataLoaded] = useState<boolean>(false);

  useEffect(() => {
    initializeMapData().then(() => {
      setMapDataLoaded(true);
    });
  }, []);

  const getTerrainTypeAndColor = (
    x: number,
    y: number,
    maxX: number,
    maxY: number
  ): TerrainInfo => {
    const projX =
      (x / maxX) * MAP_CONFIG.PROJECTION_WIDTH - MAP_CONFIG.X_OFFSET;
    const projY =
      (y / maxY) * MAP_CONFIG.PROJECTION_HEIGHT - MAP_CONFIG.Y_OFFSET;

    try {
      const stateInfo = getStateInfo(projX, projY);
      if (!stateInfo) {
        return {
          type: "WATER",
          color: TERRAIN_TYPES.WATER.baseColor.clone(),
        };
      }

      const baseColor = TERRAIN_TYPES.PLAINS.baseColor.clone();
      const hsl: { h: number; s: number; l: number } = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);

      const saturationOffset =
        (stateInfo.numericId * COLOR_CONFIG.SATURATION_RANGE) / 50 -
        COLOR_CONFIG.SATURATION_RANGE / 2;
      const lightnessOffset =
        (Math.sin(stateInfo.numericId) * COLOR_CONFIG.LIGHTNESS_RANGE) / 2;

      baseColor.setHSL(
        hsl.h,
        Math.max(0.3, Math.min(0.9, hsl.s + saturationOffset)),
        Math.max(0.25, Math.min(0.65, hsl.l + lightnessOffset))
      );

      const variation =
        1 + (Math.random() - 0.5) * TERRAIN_TYPES.PLAINS.tileVariation;
      baseColor.multiplyScalar(variation);

      return {
        type: "PLAINS",
        color: baseColor,
        stateName: stateInfo.name,
      };
    } catch (error) {
      console.warn("Error determining terrain type:", error);
      return {
        type: "WATER",
        color: TERRAIN_TYPES.WATER.baseColor.clone(),
      };
    }
  };

  const { waterGeometry, landGeometry } = useMemo(() => {
    const landGeo = new CylinderGeometry(
      HEX_CONFIG.RADIUS * HEX_CONFIG.SCALE,
      HEX_CONFIG.RADIUS * HEX_CONFIG.SCALE,
      HEX_CONFIG.LAND_HEIGHT,
      6,
      1,
      false
    );

    const singleWaterHex = new CylinderGeometry(
      HEX_CONFIG.RADIUS * HEX_CONFIG.SCALE,
      HEX_CONFIG.RADIUS * HEX_CONFIG.SCALE,
      HEX_CONFIG.WATER_HEIGHT,
      6,
      1,
      false
    );

    return { waterGeometry: singleWaterHex, landGeometry: landGeo };
  }, []);

  const { waterMesh, landHexes } = useMemo(() => {
    const water: { positions: number[]; indices: number[] } = {
      positions: [],
      indices: [],
    };
    const land: HexData[] = [];
    const width = HEX_CONFIG.RADIUS * Math.sqrt(3);
    const height = HEX_CONFIG.RADIUS * 2;
    const verticalSpacing = height * HEX_CONFIG.VERTICAL_SPACING;
    const horizontalSpacing = width * HEX_CONFIG.HORIZONTAL_SPACING;

    // Matrix for transforming each hex instance
    const matrix = new Matrix4();
    let vertexOffset = 0;

    for (let row = 0; row < MAP_CONFIG.GRID_HEIGHT; row++) {
      for (let col = 0; col < MAP_CONFIG.GRID_WIDTH; col++) {
        const x = col * horizontalSpacing + (row % 2) * (horizontalSpacing / 2);
        const z = row * verticalSpacing;

        const {
          type: terrainType,
          color,
          stateName,
        } = getTerrainTypeAndColor(
          col,
          row,
          MAP_CONFIG.GRID_WIDTH - 1,
          MAP_CONFIG.GRID_HEIGHT - 1
        );

        const heightVar =
          1 + (Math.random() - 0.5) * (terrainType === "WATER" ? 0.005 : 0.01);
        const baseHeight =
          terrainType === "WATER"
            ? HEX_CONFIG.WATER_HEIGHT / 2
            : (HEX_CONFIG.LAND_HEIGHT * heightVar) / 2;

        const position: [number, number, number] = [
          x - (MAP_CONFIG.GRID_WIDTH * horizontalSpacing) / 2,
          baseHeight,
          z - (MAP_CONFIG.GRID_HEIGHT * verticalSpacing) / 2,
        ];

        if (terrainType === "WATER") {
          // Add the water hex to the merged geometry
          matrix.setPosition(position[0], position[1], position[2]);
          const positions = Array.from(waterGeometry.attributes.position.array);
          const indices = Array.from(waterGeometry.index!.array);

          // Transform vertices
          for (let i = 0; i < positions.length; i += 3) {
            const vertex = new Vector3(
              positions[i],
              positions[i + 1],
              positions[i + 2]
            );
            vertex.applyMatrix4(matrix);
            water.positions.push(vertex.x, vertex.y, vertex.z);
          }

          // Add indices with offset
          for (let i = 0; i < indices.length; i++) {
            water.indices.push(indices[i] + vertexOffset);
          }
          vertexOffset += positions.length / 3;
        } else {
          land.push({
            position,
            color,
            terrainType,
            stateName,
            key: `${row}-${col}`,
          });
        }
      }
    }

    // Create the merged water geometry
    const mergedWaterGeometry = new BufferGeometry();
    mergedWaterGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(water.positions), 3)
    );
    mergedWaterGeometry.setIndex(water.indices);
    mergedWaterGeometry.computeVertexNormals();

    return {
      waterMesh: mergedWaterGeometry,
      landHexes: land,
    };
  }, [mapDataLoaded, waterGeometry]);

  if (!mapDataLoaded) {
    return null;
  }

  return (
    <group>
      <mesh geometry={waterMesh}>
        <meshStandardMaterial
          color={TERRAIN_TYPES.WATER.baseColor}
          roughness={0.7}
          metalness={0.1}
          envMapIntensity={0.3}
          side={DoubleSide}
          transparent={true}
          opacity={COLOR_CONFIG.WATER_OPACITY}
        />
      </mesh>

      <group position={[0, 0.01, 0]}>
        {landHexes.map(({ position, color, stateName, key }) => (
          <mesh
            key={key}
            geometry={landGeometry}
            position={new Vector3(...position)}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (stateName) {
                console.log(`Clicked on ${stateName}`);
              }
            }}
          >
            <meshStandardMaterial
              color={color}
              roughness={0.8}
              metalness={0}
              envMapIntensity={0.2}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
