"use client";

import { useEffect } from "react";
import { useSelector } from "@xstate/store/react";

import { GameUI } from "./UI/GameUI";
import { GameContext } from "@/actor/game.context";
import { clientStore } from "@/lib/clientState";
import { FPSCounter } from "./FPSCounter";
import { GameCanvas } from "./GameCanvas";
import { AuthContext } from "@/auth.context";

export function Game() {
  const state = GameContext.useSelector((state) => state);
  const userId = AuthContext.useSelector((state) => state.userId);

  // Log state changes
  useEffect(() => {
    console.log("State updated:", state);
  }, [state]);

  if (!userId) {
    return <div>Loading auth...</div>;
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <GameCanvas />
      <GameUI />
      <FPSCounter />
    </div>
  );
}
