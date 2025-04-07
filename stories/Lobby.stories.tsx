import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { Lobby } from "@/components/UI/Lobby";
import { getPlayerColor } from "@/lib/constants";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";
import { AuthContext } from "@/auth.context";
import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { AuthClient } from "@open-game-collective/auth-kit/client";
import { GamePrivateContext } from "@/actor/game.types";
import { WorldContextProvider } from "@/components/WorldContext";
import { initializeCommodityMarket } from "@/ecs/systems/CommoditySystem";
import hexGrid from "@/../public/hexgrid.json";
import { HexGrid } from "@/lib/HexGrid";

const meta: Meta<typeof Lobby> = {
  component: Lobby,
  title: "Components/Lobby",
  parameters: {
    layout: "centered",
  },
  decorators: [
    withActorKit<GameMachine>({
      actorType: "game",
      context: GameContext,
    }),
  ],
};

export default meta;
type Story = StoryObj<typeof Lobby>;

// Constants
const PLAYER_ID = "fake-player-id";

// Create a basic player object to reduce repetition
const createPlayer = (id: string, name: string, number: number, isHost: boolean = false) => {
  return {
    name,
    id,
    number,
    money: 1000,
    powerSoldKWh: 0,
    isHost,
    color: getPlayerColor(number),
  };
};

// Create a default empty private context
const createEmptyPrivateContext = (): GamePrivateContext => {
  return {
    entitiesById: {},
  };
};

// Mock the AuthClient
const createMockAuthClient = (userId: string | null = PLAYER_ID): AuthClient => {
  return {
    getState: () => ({
      isLoading: false,
      host: "localhost:8787",
      userId: userId,
      sessionToken: userId ? "fake-session-token" : null,
      refreshToken: userId ? "fake-refresh-token" : null,
      isVerified: !!userId,
      error: undefined,
    }),
    subscribe: () => () => {},
    requestCode: () => Promise.resolve(),
    verifyEmail: () => Promise.resolve({ success: true }),
    logout: () => Promise.resolve(),
    refresh: () => Promise.resolve(),
  } as any as AuthClient;
};

// Helper function to mount the lobby component with proper context
const LobbyWithContext: React.FC<{
  players: Record<string, any>;
  userId?: string | null;
}> = ({ players, userId = null }) => {
  const mockAuthClient = createMockAuthClient(userId);

  return (
    <AuthContext.Provider client={mockAuthClient}>
      <Lobby players={players} />
    </AuthContext.Provider>
  );
};

// Empty lobby with no players
export const EmptyLobby: Story = {
  render: () => {
    const players = {};
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players,
          time: { totalTicks: 0, isPaused: true },
          auction: null,
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: {},
        },
        private: createEmptyPrivateContext(),
        value: "lobby",
      },
    });

    return (
      <GameContext.ProviderFromClient client={client}>
        <WorldContextProvider>
          <LobbyWithContext players={players} userId={null} />
        </WorldContextProvider>
      </GameContext.ProviderFromClient>
    );
  },
};

// Lobby with a single player (the host)
export const SinglePlayer: Story = {
  render: () => {
    const players = {
      "player-1": createPlayer("player-1", "Player 1", 1, true),
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players,
          time: { totalTicks: 0, isPaused: true },
          auction: null,
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: {},
        },
        private: createEmptyPrivateContext(),
        value: "lobby",
      },
    });

    return (
      <GameContext.ProviderFromClient client={client}>
        <WorldContextProvider>
          <LobbyWithContext players={players} userId="player-1" />
        </WorldContextProvider>
      </GameContext.ProviderFromClient>
    );
  },
};

// Lobby with multiple players waiting for game to start (current user is host)
export const MultiplePlayersWaitingAsHost: Story = {
  render: () => {
    const players = {
      "player-1": createPlayer("player-1", "Player 1", 1, true),
      "player-2": createPlayer("player-2", "Player 2", 2),
      "player-3": createPlayer("player-3", "Player 3", 3),
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players,
          time: { totalTicks: 0, isPaused: true },
          auction: null,
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: {},
        },
        private: createEmptyPrivateContext(),
        value: "lobby",
      },
    });

    return (
      <GameContext.ProviderFromClient client={client}>
        <WorldContextProvider>
          <LobbyWithContext players={players} userId="player-1" />
        </WorldContextProvider>
      </GameContext.ProviderFromClient>
    );
  },
};

// Lobby with multiple players waiting for game to start (current user is not host)
export const MultiplePlayersWaitingAsParticipant: Story = {
  render: () => {
    const players = {
      "player-1": createPlayer("player-1", "Player 1", 1, true),
      "player-2": createPlayer("player-2", "Player 2", 2),
      "player-3": createPlayer("player-3", "Player 3", 3),
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players,
          time: { totalTicks: 0, isPaused: true },
          auction: null,
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: {},
        },
        private: createEmptyPrivateContext(),
        value: "lobby",
      },
    });

    return (
      <GameContext.ProviderFromClient client={client}>
        <WorldContextProvider>
          <LobbyWithContext players={players} userId="player-2" />
        </WorldContextProvider>
      </GameContext.ProviderFromClient>
    );
  },
};
