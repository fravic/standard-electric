"use client";

import React from "react";

import { HexDetailsUI } from "./HexGrid/HexDetailsUI";
import { FPSCounter } from "./FPSCounter";
import { GameUI } from "./UI/GameUI";
import { GameContext } from "@/actor/game.context";
import { GameCanvas } from "./GameCanvas";

export function Game(): JSX.Element {
  const isDebug = GameContext.useSelector((state) => state.public.isDebug);
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <GameCanvas />
      <GameUI />
      <HexDetailsUI />
      {isDebug && <FPSCounter />}
    </div>
  );
}
