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
};

export function HexDetailsUI() {
  const players = useGameStore((state) => state.players);
  // For now, just use the first player
  const playerId = Object.keys(players)[0];
  const selectedHexCoordinates = players[playerId]?.selectedHexCoordinates;
  const hexGrid = useGameStore((state) => state.hexGrid);

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
        {cell.terrainType || TerrainType.Plains}
      </div>
    </div>
  );
}
