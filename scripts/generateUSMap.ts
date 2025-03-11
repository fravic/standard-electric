import { TerrainType } from "../app/lib/HexCell";
import { getStateNameAtCoordinates } from "../app/lib/MapData";
import fs from "fs";
import path from "path";
import { createHexGrid, HexGrid } from "../app/lib/HexGrid";
import { createHexCell } from "../app/lib/HexCell";
import { loadUnitedStatesMapData } from "../app/lib/unitedStatesGeoUtils";

async function generateMap() {
  // Load the US map data
  const mapData = await loadUnitedStatesMapData();
  if (!mapData) {
    console.error("Failed to load US map data");
    return;
  }

  // Create hex grid
  const hexGrid = createHexGrid(30, 24);

  // Generate cells
  for (let x = 0; x < hexGrid.width; x++) {
    for (let z = 0; z < hexGrid.height; z++) {
      // Get normalized coordinates (0-100)
      const normalizedX = (x / hexGrid.width) * 100;
      const normalizedZ = (z / hexGrid.height) * 100;

      // Get state info at these coordinates
      const regionName = getStateNameAtCoordinates(mapData, normalizedX, normalizedZ);
      const cell = createHexCell(x, z, regionName);

      if (!regionName) {
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
