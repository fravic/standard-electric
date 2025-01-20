"use client";

import React, { useEffect } from "react";

import { HexDetailsUI } from "./UI/HexDetailsUI";
import { FPSCounter } from "./FPSCounter";
import { GameUI } from "./UI/GameUI";
// import { GameCanvas } from "./GameCanvas";
import { useClientStore } from "@/lib/clientState";
import { GameContext } from "@/actor/game.context";

export function Game(): React.ReactNode {
  const isDebug = useClientStore((state) => state.isDebug);
  const state = GameContext.useSelector((state) => state);

  // Log state changes
  useEffect(() => {
    console.log("State updated:", state);
  }, [state]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* <GameCanvas /> */}
      {/* <GameUI />
      <HexDetailsUI /> */}
      {/* {isDebug && <FPSCounter />} */}
    </div>
  );
}
