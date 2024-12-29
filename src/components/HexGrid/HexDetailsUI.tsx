import React from "react";
import { useGameStore } from "../../store/gameStore";
import { TerrainType, Population } from "../../lib/HexCell";
import { CoalPlant } from "../../lib/PowerPlants/CoalPlant";

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
  section: {
    borderTop: "1px solid rgba(255, 255, 255, 0.2)",
    paddingTop: "8px",
    marginTop: "8px",
  },
};

export function HexDetailsUI() {
  const players = useGameStore((state) => state.players);
  const buildables = useGameStore((state) => state.buildables);
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

  // Find any power plants on this hex
  const powerPlant = buildables.find(
    (b) => b.coordinates && b.coordinates.equals(selectedHexCoordinates)
  );

  return (
    <div style={styles.container}>
      <div>
        <span style={styles.label}>
          {cell.stateInfo?.name} {selectedHexCoordinates.toString()}
        </span>
      </div>
      <div>
        <span style={styles.label}>Terrain: </span>
        {cell.terrainType || TerrainType.Plains}
      </div>
      <div>
        <span style={styles.label}>Population: </span>
        {Population[cell.population] || "Unpopulated"}
      </div>
      {powerPlant && (
        <div style={styles.section}>
          <div>
            <span style={styles.label}>Power Plant: </span>
            {powerPlant.type === "coal_plant" ? "Coal Plant" : powerPlant.type}
          </div>
          <div>
            <span style={styles.label}>Owner: </span>
            {players[powerPlant.playerId]?.name || "Unknown"}
          </div>
        </div>
      )}
    </div>
  );
}
