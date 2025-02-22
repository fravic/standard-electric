import React, { useState, useEffect } from "react";
import { useSelector } from "@xstate/store/react";
import { TerrainType, Population } from "../../lib/HexCell";
import { GameContext } from "@/actor/game.context";
import * as HexGridService from "@/lib/HexGrid";
import * as HexCoordinatesService from "@/lib/coordinates/HexCoordinates";
import { clientStore } from "@/lib/clientState";
import { Card } from "./Card";
import { isBuilt } from "@/lib/buildables/Buildable";

const styles = {
  container: {
    position: "fixed" as const,
    zIndex: 100,
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    pointerEvents: "none" as "none",
    maxWidth: "200px",
  },
  label: {
    fontWeight: "bold" as const,
    opacity: 0.8,
  },
  section: {
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    paddingTop: "4px",
    marginTop: "4px",
  },
};

export function HexDetailsUI() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isOverMap, setIsOverMap] = useState(false);
  const hoveringHexCoordinates = useSelector(
    clientStore,
    (state) => state.context.hoveringHexCoordinates
  );
  const hexGrid = GameContext.useSelector((state) => state.public.hexGrid);
  const buildables = GameContext.useSelector(
    (state) => state.public.buildables
  );
  const players = GameContext.useSelector((state) => state.public.players);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX + 15, y: e.clientY + 15 });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const isCanvas = (e.target as HTMLElement)?.tagName === "CANVAS";
      setIsOverMap(isCanvas);

      if (!isCanvas) {
        clientStore.send({
          type: "setHoveringHex",
          coordinates: null,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver, true);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver, true);
    };
  }, []);

  if (!hoveringHexCoordinates || !isOverMap) {
    return null;
  }

  const cell = HexGridService.getCell(hexGrid, hoveringHexCoordinates);
  if (!cell) {
    return null;
  }

  const powerPlant = buildables.find(
    (b) =>
      b.coordinates &&
      HexCoordinatesService.equals(b.coordinates, hoveringHexCoordinates)
  );

  return (
    <div
      style={{
        ...styles.container,
        left: `${mousePos.x}px`,
        top: `${mousePos.y}px`,
      }}
    >
      <Card variant="dark">
        <div>
          <span style={styles.label}>
            {cell.regionName}{" "}
            {HexCoordinatesService.coordinatesToString(hoveringHexCoordinates)}
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
        {powerPlant && isBuilt(powerPlant) && (
          <div style={styles.section}>
            <div>
              <span style={styles.label}>Power Plant: </span>
              {powerPlant.type === "coal_plant"
                ? "Coal Plant"
                : powerPlant.type}
            </div>
            <div>
              <span style={styles.label}>Owner: </span>
              {players[powerPlant.playerId]?.name || "Unknown"}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
