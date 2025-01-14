"use client";

import React from "react";

import { HexDetailsUI } from "./UI/HexDetailsUI";
import { FPSCounter } from "./FPSCounter";
import { GameUI } from "./UI/GameUI";
import { GameCanvas } from "./GameCanvas";
import { useClientStore } from "@/lib/clientState";

export function Game(): React.ReactNode {
  const isDebug = useClientStore((state) => state.isDebug);
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <GameCanvas />
      <GameUI />
      <HexDetailsUI />
      {isDebug && <FPSCounter />}
    </div>
  );
}
