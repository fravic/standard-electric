import { TerrainType } from "../src/lib/HexCell";
import { getStateInfoAtCoordinates } from "../src/lib/MapData";
import fs from "fs";
import path from "path";
import { createHexGrid, HexGrid } from "../src/lib/HexGrid";
import { createHexCell } from "../src/lib/HexCell";
import { loadUnitedStatesMapData } from "../src/lib/unitedStatesGeoUtils";

async function generateMap() {
  // Load the US map data
  const mapData = await loadUnitedStatesMapData();
  if (!mapData) {
    console.error("Failed to load US map data");
    return;
  }

  // Create hex grid
  const hexGrid = createHexGrid(60, 40);

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
      const cell = createHexCell(x, z, stateInfo);

      if (!stateInfo) {
        // This is a water tile
        cell.terrainType = TerrainType.Water;
      } else {
        cell.terrainType = TerrainType.Plains;
      }

      hexGrid.cellsByHexCoordinates[`${x},${z}`] = cell;
    }
  }

  // Write the updated hexgrid.json file
  const hexgridPath = path.join(process.cwd(), "public", "hexgrid.json");
  const hexGridData: HexGrid = {
    width: hexGrid.width,
    height: hexGrid.height,
    cellsByHexCoordinates: hexGrid.cellsByHexCoordinates,
  };
  fs.writeFileSync(hexgridPath, JSON.stringify(hexGridData, null, 2));
  console.log("Generated US map with terrain data in hexgrid.json");
}

generateMap().catch(console.error);
