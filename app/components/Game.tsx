"use client";

import React, { useEffect } from "react";

import { GameUI } from "./UI/GameUI";
import { HexDetailsUI } from "./UI/HexDetailsUI";
// import { GameCanvas } from "./GameCanvas";
import { GameContext } from "@/actor/game.context";
import { useClientStore } from "@/lib/clientState";
import { FPSCounter } from "./FPSCounter";
import { GameCanvas } from "./GameCanvas";

export function Game() {
  const isDebug = useClientStore((state) => state.isDebug);
  const state = GameContext.useSelector((state) => state);

  // Log state changes
  useEffect(() => {
    console.log("State updated:", state);
  }, [state]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <GameCanvas />
      <GameUI />
      <HexDetailsUI />
      {isDebug && <FPSCounter />}
    </div>
  );
}
