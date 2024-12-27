import { TerrainType } from "../src/lib/HexCell";
import { MapData, getStateInfoAtCoordinates } from "../src/lib/MapData";
import fs from "fs";
import path from "path";
import * as d3 from "d3-geo";
import { HexGrid, HexGridData } from "../src/lib/HexGrid";
import { HexCell } from "../src/lib/HexCell";
import { loadUnitedStatesMapData } from "../src/lib/unitedStatesGeoUtils";

// USGS Land Cover data categories mapped to our terrain types
const landCoverToTerrainMap: { [key: number]: TerrainType } = {
  11: TerrainType.Water, // Open Water
  12: TerrainType.Plains, // Perennial Ice/Snow
  21: TerrainType.Plains, // Developed, Open Space
  22: TerrainType.Plains, // Developed, Low Intensity
  23: TerrainType.Plains, // Developed, Medium Intensity
  24: TerrainType.Plains, // Developed, High Intensity
  31: TerrainType.Desert, // Barren Land
  41: TerrainType.Forest, // Deciduous Forest
  42: TerrainType.Forest, // Evergreen Forest
  43: TerrainType.Forest, // Mixed Forest
  51: TerrainType.Plains, // Dwarf Scrub
  52: TerrainType.Plains, // Shrub/Scrub
  71: TerrainType.Plains, // Grassland/Herbaceous
  72: TerrainType.Plains, // Sedge/Herbaceous
  73: TerrainType.Plains, // Lichens
  74: TerrainType.Plains, // Moss
  81: TerrainType.Plains, // Pasture/Hay
  82: TerrainType.Plains, // Cultivated Crops
  90: TerrainType.Forest, // Woody Wetlands
  95: TerrainType.Plains, // Emergent Herbaceous Wetlands
};

function getLandCoverData(lat: number, lon: number): number {
  // Simplified approach based on latitude and general US geography
  if (lat > 45) {
    return 42; // Evergreen Forest for northern states
  } else if (lat < 35) {
    if (lon < -100) {
      return 31; // Desert for southwest
    }
    return 41; // Deciduous Forest for southeast
  } else {
    if (lon < -100) {
      return 71; // Grassland for great plains
    }
    return 41; // Deciduous Forest for northeast
  }
}

async function generateMap() {
  // Load the US map data
  const mapData = await loadUnitedStatesMapData();
  if (!mapData) {
    console.error("Failed to load US map data");
    return;
  }

  // Create hex grid
  const hexGrid = new HexGrid(100, 60);

  // Generate cells
  for (let x = 0; x < hexGrid.width; x++) {
    for (let z = 0; z < hexGrid.height; z++) {
      // Get normalized coordinates (0-100)
      const normalizedX = (x / hexGrid.width) * 100;
      const normalizedZ = (z / hexGrid.height) * 100;

      // Get state info at these coordinates
      const stateInfo = getStateInfoAtCoordinates(
        mapData,
        normalizedX,
        normalizedZ
      );
      const cell = new HexCell(x, z, stateInfo);

      if (!stateInfo) {
        // This is a water tile
        cell.terrainType = TerrainType.Water;
      } else {
        // Convert hex coordinates to approximate lat/lon using the projection
        const point = mapData.projection.invert?.([normalizedX, normalizedZ]);

        if (point) {
          const [lon, lat] = point;
          const landCover = getLandCoverData(lat, lon);
          cell.terrainType =
            landCoverToTerrainMap[landCover] || TerrainType.Plains;
        } else {
          cell.terrainType = TerrainType.Plains; // Fallback
        }
      }

      hexGrid.addCell(cell, x, z);
    }
  }

  // Write the updated hexgrid.json file
  const hexgridPath = path.join(process.cwd(), "public", "hexgrid.json");
  const hexGridData: HexGridData = {
    width: hexGrid.width,
    height: hexGrid.height,
    cells: hexGrid.cells.map((cell) => ({
      coordinates: {
        x: cell.coordinates.x,
        z: cell.coordinates.z,
      },
      stateInfo: cell.stateInfo,
      terrainType: cell.terrainType,
    })),
  };
  fs.writeFileSync(hexgridPath, JSON.stringify(hexGridData, null, 2));
  console.log("Generated US map with terrain data in hexgrid.json");
}

generateMap().catch(console.error);
