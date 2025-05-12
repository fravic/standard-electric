import React from "react";
import { TerrainPaintUI } from "./TerrainPaintUI";
import { HOURS_PER_DAY } from "../../lib/constants";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { isDayTime } from "@/lib/time";
import { HexDetails } from "./HexDetails";
import { clientStore } from "@/lib/clientState";
import { useSelector } from "@xstate/store/react";
import { IonCard, IonCardContent } from "@ionic/react";
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
      {currentPlayer && (
        <>
          <IonCard
            className="fixed z-10 font-mono mx-auto left-0 right-0 w-fit"
            style={{
              top: "var(--ion-safe-area-top, 10px)",
            }}
          >
            <IonCardContent className="py-2 px-4">
              Day {dayNumber} {timeEmoji}
            </IonCardContent>
          </IonCard>

          <TerrainPaintUI />
          {!isDebug && <HexDetails />}
        </>
      )}
    </>
  );
};
