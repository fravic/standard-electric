import React, { useMemo, useEffect, useState } from "react";
import { CylinderGeometry, Color } from "three";
import {
  initializeMapData,
  isPointInUS,
  getStateInfo,
} from "../utils/geoUtils";

// Map dimensions and scale
const MAP_CONFIG = {
  PROJECTION_WIDTH: 1000, // Width of the projection space
  PROJECTION_HEIGHT: 600, // Height of the projection space
  GRID_WIDTH: 150, // Number of hexes horizontally
  GRID_HEIGHT: 90, // Number of hexes vertically
};

// Color configuration
const COLOR_CONFIG = {
  // Base green for land (a soft, pastel green)
  LAND_BASE: new Color("#93c9a1"),
  // Color variation parameters
  SATURATION_RANGE: 0.2, // How much to vary the saturation
  LIGHTNESS_RANGE: 0.15, // How much to vary the lightness
  WATER: new Color("#a8d0e6"), // Pastel blue for water
  WATER_OPACITY: 0.85, // Slight transparency for water
};

// Terrain types configuration
const TERRAIN_TYPES = {
  PLAINS: {
    baseColor: COLOR_CONFIG.LAND_BASE,
    stateColorVariation: 0.3,
    tileVariation: 0.05,
  },
  WATER: {
    baseColor: COLOR_CONFIG.WATER,
    opacity: COLOR_CONFIG.WATER_OPACITY,
    variations: [0.95, 0.975, 1, 1.025, 1.05],
  },
};

// Hex geometry configuration
const HEX_CONFIG = {
  RADIUS: 0.3, // Smaller radius for higher density
  HEIGHT: 0.05,
  SCALE: 1.01, // Slight scale up to prevent gaps
  VERTICAL_SPACING: 0.745,
  HORIZONTAL_SPACING: 0.995,
};

const HexGrid = () => {
  const [mapDataLoaded, setMapDataLoaded] = useState(false);

  useEffect(() => {
    initializeMapData().then(() => {
      setMapDataLoaded(true);
    });
  }, []);

  const hexGeometry = useMemo(() => {
    return new CylinderGeometry(
      HEX_CONFIG.RADIUS * HEX_CONFIG.SCALE,
      HEX_CONFIG.RADIUS * HEX_CONFIG.SCALE,
      HEX_CONFIG.HEIGHT,
      6,
      1,
      false
    );
  }, []);

  const getTerrainTypeAndColor = (x, y, maxX, maxY) => {
    const projX = (x / maxX) * MAP_CONFIG.PROJECTION_WIDTH;
    const projY = (y / maxY) * MAP_CONFIG.PROJECTION_HEIGHT;

    try {
      const stateInfo = getStateInfo(projX, projY);
      if (!stateInfo) {
        return {
          type: "WATER",
          color: TERRAIN_TYPES.WATER.baseColor.clone(),
          opacity: TERRAIN_TYPES.WATER.opacity,
        };
      }

      // Generate a state-specific color variation
      const baseColor = TERRAIN_TYPES.PLAINS.baseColor.clone();
      const hsl = {};
      baseColor.getHSL(hsl);

      // Vary saturation and lightness based on state ID
      const saturationOffset =
        (stateInfo.numericId * COLOR_CONFIG.SATURATION_RANGE) / 50 -
        COLOR_CONFIG.SATURATION_RANGE / 2;
      const lightnessOffset =
        (Math.sin(stateInfo.numericId) * COLOR_CONFIG.LIGHTNESS_RANGE) / 2;

      baseColor.setHSL(
        hsl.h,
        Math.max(0.1, Math.min(1, hsl.s + saturationOffset)),
        Math.max(0.2, Math.min(0.8, hsl.l + lightnessOffset))
      );

      // Add subtle random variation
      const variation =
        1 + (Math.random() - 0.5) * TERRAIN_TYPES.PLAINS.tileVariation;
      baseColor.multiplyScalar(variation);

      return {
        type: "PLAINS",
        color: baseColor,
        opacity: 1,
        stateName: stateInfo.name,
      };
    } catch (error) {
      console.warn("Error determining terrain type:", error);
      return {
        type: "WATER",
        color: TERRAIN_TYPES.WATER.baseColor.clone(),
        opacity: TERRAIN_TYPES.WATER.opacity,
      };
    }
  };

  const hexagons = useMemo(() => {
    const hexes = [];
    const width = HEX_CONFIG.RADIUS * Math.sqrt(3);
    const height = HEX_CONFIG.RADIUS * 2;
    const verticalSpacing = height * HEX_CONFIG.VERTICAL_SPACING;
    const horizontalSpacing = width * HEX_CONFIG.HORIZONTAL_SPACING;

    for (let row = 0; row < MAP_CONFIG.GRID_HEIGHT; row++) {
      for (let col = 0; col < MAP_CONFIG.GRID_WIDTH; col++) {
        const x = col * horizontalSpacing + (row % 2) * (horizontalSpacing / 2);
        const z = row * verticalSpacing;

        const {
          type: terrainType,
          color,
          opacity,
          stateName,
        } = getTerrainTypeAndColor(
          col,
          row,
          MAP_CONFIG.GRID_WIDTH - 1,
          MAP_CONFIG.GRID_HEIGHT - 1
        );

        const heightVar =
          1 + (Math.random() - 0.5) * (terrainType === "WATER" ? 0.005 : 0.01);

        hexes.push({
          position: [
            x - (MAP_CONFIG.GRID_WIDTH * horizontalSpacing) / 2,
            (HEX_CONFIG.HEIGHT * heightVar) / 2,
            z - (MAP_CONFIG.GRID_HEIGHT * verticalSpacing) / 2,
          ],
          color,
          opacity,
          terrainType,
          stateName,
          key: `${row}-${col}`,
        });
      }
    }
    return hexes;
  }, [mapDataLoaded]);

  if (!mapDataLoaded) {
    return null;
  }

  return (
    <group>
      {hexagons.map(
        ({ position, color, opacity, terrainType, stateName, key }) => (
          <mesh
            key={key}
            geometry={hexGeometry}
            position={position}
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
              flatShading={true}
              transparent={true}
              opacity={opacity}
              roughness={terrainType === "WATER" ? 0.3 : 0.8}
              metalness={terrainType === "WATER" ? 0.3 : 0}
            />
          </mesh>
        )
      )}
    </group>
  );
};

export default HexGrid;
