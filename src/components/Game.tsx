"use client";

import React from "react";
import dynamic from "next/dynamic";

import { HexDetailsUI } from "./HexGrid/HexDetailsUI";
import { FPSCounter } from "./FPSCounter";
import { GameUI } from "./UI/GameUI";
import { GameContext } from "@/actor/game.context";

const GameCanvas = dynamic(() => import("./GameCanvas"), {
  ssr: false,
});

export function Game(): JSX.Element {
  const isDebug = GameContext.useSelector((state) => state.public.isDebug);
  return (
    <div className="game-container">
      <GameCanvas />
      {isDebug && <FPSCounter />}
      <GameUI />
      <HexDetailsUI />
    </div>
  );
}
