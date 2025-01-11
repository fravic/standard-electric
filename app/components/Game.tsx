import { useGameStore } from "@/store/gameStore";
import { useParams } from "@remix-run/react";
import { FPSCounter } from "./FPSCounter";
import GameCanvas from "./GameCanvas";
import { HexDetailsUI } from "./HexGrid/HexDetailsUI";
import { GameUI } from "./UI/GameUI";

export function Game(): JSX.Element {
  const isDebug = useGameStore((state) => state.isDebug);
  const gameId = useParams().gameId!;

  return (
    <div className="game-container">
      Game {gameId}
      {isDebug && <FPSCounter />}
      <GameUI />
      <HexDetailsUI />
      {/* <GameCanvas /> */}
      {/* {/* <GameCanvas /> */}
      {/* {isDebug && <FPSCounter />} */}
    </div>
  );
}
