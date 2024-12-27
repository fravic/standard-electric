import { TerrainType } from "../src/lib/HexCell";
import { getStateInfoAtCoordinates } from "../src/lib/MapData";
import fs from "fs";
import path from "path";
import { HexGrid, HexGridData } from "../src/lib/HexGrid";
import { HexCell } from "../src/lib/HexCell";
import { loadUnitedStatesMapData } from "../src/lib/unitedStatesGeoUtils";

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
        cell.terrainType = TerrainType.Plains;
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
