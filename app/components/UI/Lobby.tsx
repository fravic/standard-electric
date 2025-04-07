import React, { useState } from "react";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { Player } from "@/actor/game.types";
import { TextInput } from "./TextInput";
import { Card } from "./Card";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

const MAX_PLAYERS = 6;

interface LobbyProps {
  players: Record<string, Player>;
}

export const Lobby: React.FC<LobbyProps> = ({ players }) => {
  const [playerName, setPlayerName] = useState("");
  const userId = AuthContext.useSelector((state) => state.userId);
  const currentPlayer = userId ? players[userId] : undefined;
  const playerCount = Object.keys(players).length;
  const isHost = currentPlayer?.isHost;
  const canStartGame = isHost && playerCount > 1;
  const canJoin = playerCount < MAX_PLAYERS && !currentPlayer && playerName.trim().length > 0;
  const sendGameEvent = GameContext.useSend();

  const handleJoin = () => {
    if (canJoin) {
      sendGameEvent({ type: "JOIN_GAME", name: playerName.trim() });
    }
  };

  const handleStartGame = () => {
    if (canStartGame) {
      sendGameEvent({ type: "START_GAME" });
    }
  };

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 min-w-[300px]">
      <Card className="p-6">
        <h2 className="text-2xl mb-5 text-center font-serif-extra">Game Lobby</h2>
        <div className="text-center mb-4 opacity-80">
          Players: {playerCount}/{MAX_PLAYERS}
        </div>

        {!currentPlayer ? (
          <div className="flex flex-col gap-3">
            <TextInput
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
            />
            <Button onClick={handleJoin} disabled={!canJoin} fullWidth>
              Join Game
            </Button>
          </div>
        ) : isHost ? (
          <Button onClick={handleStartGame} disabled={!canStartGame} fullWidth>
            Start Game
          </Button>
        ) : (
          <div className="text-center mt-4 opacity-80">Waiting for host to start...</div>
        )}

        {playerCount > 0 && (
          <div className="mt-6">
            <h3 className="text-lg mb-2 font-serif-extra">Players</h3>
            <ul className="flex flex-col gap-2">
              {Object.values(players).map((player) => (
                <li key={player.id} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-[1px]"
                    style={{ backgroundColor: player.color }}
                  />
                  <span>
                    {player.name} {player.isHost && "(Host)"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
};
