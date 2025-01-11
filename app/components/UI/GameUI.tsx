import React from "react";
import { useGameStore } from "../../store/gameStore";
import { HexDetailsUI } from "../HexGrid/HexDetailsUI";
import { TerrainPaintUI } from "./TerrainPaintUI";
import { PLAYER_ID } from "@/constants";

export const GameUI: React.FC = () => {
  // During SSR, use the store's snapshot directly
  if (typeof window === 'undefined') {
    return (
      <div className="game-ui">
        <TerrainPaintUI />
      </div>
    );
  }

  // On client, use the React hooks
  const isPaintbrushMode = useGameStore((state) => state.mapBuilder.isPaintbrushMode);
  const player = useGameStore((state) => state.players[PLAYER_ID]);

  return (
    <div className="game-ui">
      {isPaintbrushMode && <TerrainPaintUI />}
      {/* Add other UI components as needed */}
    </div>
  );
};
