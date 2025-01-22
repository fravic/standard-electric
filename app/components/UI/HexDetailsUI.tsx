import React from "react";
import { useSelector } from "@xstate/store/react";
import { TerrainType, Population } from "../../lib/HexCell";
import { GameContext } from "@/actor/game.context";
import * as HexGridService from "@/lib/HexGrid";
import * as HexCoordinatesService from "@/lib/coordinates/HexCoordinates";
import { clientStore } from "@/lib/clientState";

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
  const selectedHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.selectedHexCoordinates
  );
  const hexGrid = GameContext.useSelector((state) => state.public.hexGrid);
  const buildables = GameContext.useSelector(
    (state) => state.public.buildables
  );
  const players = GameContext.useSelector((state) => state.public.players);

  if (!selectedHexCoordinates) {
    return null;
  }

  const cell = HexGridService.getCell(hexGrid, selectedHexCoordinates);
  if (!cell) {
    return null;
  }

  // Find any power plants on this hex
  const powerPlant = buildables.find(
    (b) =>
      b.coordinates &&
      HexCoordinatesService.equals(b.coordinates, selectedHexCoordinates)
  );

  return (
    <div style={styles.container}>
      <div>
        <span style={styles.label}>
          {cell.stateInfo?.name}{" "}
          {HexCoordinatesService.coordinatesToString(selectedHexCoordinates)}
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
