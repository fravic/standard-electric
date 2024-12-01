import React, { useMemo, useEffect, useState } from "react";
import {
  CylinderGeometry,
  Color,
  DoubleSide,
  PlaneGeometry,
  BackSide,
} from "three";
import {
  initializeMapData,
  isPointInUS,
  getStateInfo,
} from "../utils/geoUtils";

// Map dimensions and scale
const MAP_CONFIG = {
  PROJECTION_WIDTH: 1200,
  PROJECTION_HEIGHT: 800,
  GRID_WIDTH: 200,
  GRID_HEIGHT: 130,
  X_OFFSET: 120,
  Y_OFFSET: 100,
};

// Color configuration
const COLOR_CONFIG = {
  LAND_BASE: new Color("#68dba2"),
  SATURATION_RANGE: 0.25,
  LIGHTNESS_RANGE: 0.2,
  WATER: new Color("#5d8bca"),
  WATER_OPACITY: 0.85,
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
    variations: [0.95, 0.975, 1, 1.025, 1.05],
  },
};

// Hex geometry configuration
const HEX_CONFIG = {
  RADIUS: 0.3,
  WATER_HEIGHT: 0.05,
  LAND_HEIGHT: 0.3, // Much taller for land hexes
  WATER_VERTICAL_OFFSET: 0.15, // Half of LAND_HEIGHT to position water tiles halfway up
  SCALE: 1.01,
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

  const getTerrainTypeAndColor = (x, y, maxX, maxY) => {
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
        Math.max(0.3, Math.min(0.9, hsl.s + saturationOffset)),
        Math.max(0.25, Math.min(0.65, hsl.l + lightnessOffset))
      );

      // Add subtle random variation
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

  // Create separate geometries for water and land
  const { waterGeometry, landGeometry } = useMemo(() => {
    // For land hexes, use cylinder with full height
    const landGeo = new CylinderGeometry(
      HEX_CONFIG.RADIUS * HEX_CONFIG.SCALE,
      HEX_CONFIG.RADIUS * HEX_CONFIG.SCALE,
      HEX_CONFIG.LAND_HEIGHT,
      6,
      1,
      false
    );

    // For water, use a simple plane (much fewer vertices)
    const waterGeo = new PlaneGeometry(
      HEX_CONFIG.RADIUS * 2 * HEX_CONFIG.SCALE,
      HEX_CONFIG.RADIUS * 2 * HEX_CONFIG.SCALE
    );
    waterGeo.rotateX(-Math.PI / 2); // Rotate to be horizontal

    return { waterGeometry: waterGeo, landGeometry: landGeo };
  }, []);

  // Separate water and land hexes into different arrays
  const { waterHexes, landHexes } = useMemo(() => {
    const water = [];
    const land = [];
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
            ? HEX_CONFIG.WATER_VERTICAL_OFFSET
            : (HEX_CONFIG.LAND_HEIGHT * heightVar) / 2;

        const hex = {
          position: [
            x - (MAP_CONFIG.GRID_WIDTH * horizontalSpacing) / 2,
            baseHeight,
            z - (MAP_CONFIG.GRID_HEIGHT * verticalSpacing) / 2,
          ],
          color,
          terrainType,
          stateName,
          key: `${row}-${col}`,
        };

        if (terrainType === "WATER") {
          water.push(hex);
        } else {
          land.push(hex);
        }
      }
    }
    return { waterHexes: water, landHexes: land };
  }, [mapDataLoaded]);

  if (!mapDataLoaded) {
    return null;
  }

  return (
    <group>
      {/* Render water hexes first */}
      <group>
        {waterHexes.map(({ position, color, key }) => (
          <mesh key={key} geometry={waterGeometry} position={position}>
            <meshStandardMaterial
              color={color}
              roughness={0.7}
              metalness={0.1}
              envMapIntensity={0.3}
              side={BackSide} // Render only back faces for better performance
              transparent={false} // Disable transparency for better performance
            />
          </mesh>
        ))}
      </group>

      {/* Render land hexes on top */}
      <group position={[0, 0.01, 0]}>
        {" "}
        {/* Slight Y offset to prevent z-fighting */}
        {landHexes.map(({ position, color, stateName, key }) => (
          <mesh
            key={key}
            geometry={landGeometry}
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
              roughness={0.8}
              metalness={0}
              envMapIntensity={0.2}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export default HexGrid;
