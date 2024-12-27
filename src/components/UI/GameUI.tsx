import React from "react";
import { useGameStore } from "../../store/gameStore";
import { HexDetailsUI } from "../HexGrid/HexDetailsUI";
import { TerrainPaintUI } from "./TerrainPaintUI";

export const GameUI: React.FC = () => {
  return (
    <>
      <TerrainPaintUI />
      <HexDetailsUI />
    </>
  );
};
