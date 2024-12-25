import React from "react";
import { useGameStore } from "../../store/gameStore";
import { TerrainType } from "../../lib/HexCell";

const styles = {
  container: {
    position: "fixed" as const,
    top: "10px",
    right: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "white",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    fontSize: "14px",
    zIndex: 1000,
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
  label: {
    fontWeight: "bold" as const,
  },
  select: {
    backgroundColor: "#4CAF50",
    border: "none",
    color: "white",
    padding: "8px 16px",
    fontSize: "14px",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export function HexDetailsUI() {
  const players = useGameStore((state) => state.players);
  // For now, just use the first player
  const playerId = Object.keys(players)[0];
  const selectedHexCoordinates = players[playerId]?.selectedHexCoordinates;
  const hexGrid = useGameStore((state) => state.hexGrid);
  const isDebug = useGameStore((state) => state.isDebug);
  const updateHexTerrain = useGameStore((state) => state.updateHexTerrain);

  if (!selectedHexCoordinates) {
    return null;
  }

  const cell = hexGrid.getCell(selectedHexCoordinates);
  if (!cell) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div>
        <span style={styles.label}>Coordinates: </span>
        {selectedHexCoordinates.toString()}
      </div>
      <div>
        <span style={styles.label}>State: </span>
        {cell.stateInfo?.name || "None"}
      </div>
      <div>
        <span style={styles.label}>Terrain: </span>
        {isDebug ? (
          <select
            style={styles.select}
            value={cell.terrainType || TerrainType.Plains}
            onChange={(e) =>
              updateHexTerrain(
                selectedHexCoordinates,
                e.target.value as TerrainType
              )
            }
          >
            {Object.values(TerrainType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        ) : (
          cell.terrainType || TerrainType.Plains
        )}
      </div>
    </div>
  );
}
