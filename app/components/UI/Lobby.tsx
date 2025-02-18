import React, { useState } from "react";
import { UI_COLORS } from "@/lib/palette";
import { GameContext } from "@/actor/game.context";
import { AuthContext } from "@/auth.context";
import { Player } from "@/actor/game.types";
import { TextInput } from "./TextInput";

const MAX_PLAYERS = 6;

const styles = {
  container: {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: UI_COLORS.BACKGROUND,
    color: "white",
    padding: "20px",
    borderRadius: "10px",
    fontFamily: "monospace",
    zIndex: 1000,
    minWidth: "300px",
  },
  title: {
    fontSize: "24px",
    marginBottom: "20px",
    textAlign: "center" as const,
  },
  button: {
    width: "100%",
    backgroundColor: UI_COLORS.PRIMARY,
    border: "none",
    color: UI_COLORS.TEXT_LIGHT,
    padding: "10px",
    textAlign: "center" as const,
    cursor: "pointer",
    borderRadius: "4px",
    marginTop: "10px",
  },
  disabledButton: {
    backgroundColor: UI_COLORS.PRIMARY_DARK,
    cursor: "not-allowed",
    opacity: 0.7,
  },
  playerList: {
    marginTop: "20px",
  },
  playerCount: {
    textAlign: "center" as const,
    marginBottom: "10px",
    color: UI_COLORS.TEXT_LIGHT,
  },
};

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
  const canJoin =
    playerCount < MAX_PLAYERS && !currentPlayer && playerName.trim().length > 0;
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
    <div style={styles.container}>
      <div style={styles.title}>Game Lobby</div>
      <div style={styles.playerCount}>
        Players: {playerCount}/{MAX_PLAYERS}
      </div>

      {!currentPlayer ? (
        <>
          <TextInput
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            style={{ marginBottom: "10px" }}
          />
          <button
            style={{
              ...styles.button,
              ...(canJoin ? {} : styles.disabledButton),
            }}
            onClick={handleJoin}
            disabled={!canJoin}
          >
            Join Game
          </button>
        </>
      ) : isHost ? (
        <button
          style={{
            ...styles.button,
            ...(canStartGame ? {} : styles.disabledButton),
          }}
          onClick={handleStartGame}
          disabled={!canStartGame}
        >
          Start Game
        </button>
      ) : (
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          Waiting for host to start...
        </div>
      )}
    </div>
  );
};
