import React from "react";
import { HexPreviewTooltip } from "./HexPreviewTooltip";
import { TerrainPaintUI } from "./TerrainPaintUI";
import { HOURS_PER_DAY } from "../../lib/constants";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { isDayTime } from "@/lib/time";
import { BuildBar } from "./BuildBar";
import { HexDetails } from "./HexDetails";
import { clientStore } from "@/lib/clientState";
import { useSelector } from "@xstate/store/react";
import { Card } from "./Card";
import { JoinGamePrompt } from "./JoinGamePrompt";

export const GameUI: React.FC = () => {
  const userId = AuthContext.useSelector((state) => state.userId);
  const { players, time } = GameContext.useSelector((state) => state.public);
  const isInGame = userId && players[userId];
  const currentPlayer = isInGame ? players[userId] : undefined;
  const { totalTicks } = time;
  const timeEmoji = isDayTime(totalTicks) ? "☀️" : "🌙";
  const dayNumber = Math.floor(totalTicks / HOURS_PER_DAY) + 1;
  const isDebug = useSelector(clientStore, (state: any) => state.context.isDebug);

  // Show join game prompt if player is not in the game
  if (!isInGame && userId) {
    return <JoinGamePrompt />;
  }

  return (
    <>
      <div className="fixed top-[10px] left-[10px] z-10 max-h-[calc(100vh-20px)] overflow-y-auto w-[300px]">
        {currentPlayer && <BuildBar player={currentPlayer} />}
      </div>

      {currentPlayer && (
        <>
          <Card className="fixed top-[10px] right-[10px] z-10 font-mono py-2 px-3">
            Day {dayNumber} {timeEmoji}
          </Card>

          <TerrainPaintUI />
          <HexPreviewTooltip />
          {!isDebug && <HexDetails />}
        </>
      )}
    </>
  );
};
