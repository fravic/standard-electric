import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";

import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { Game } from "@/components/Game";
import { HexGrid } from "@/lib/HexGrid";
import { initializeCommodityMarket } from "@/lib/market/CommodityMarket";

import hexGrid from "@/../public/hexgrid.json";
import { CornerPosition } from "@/lib/coordinates/types";
import { createPowerPole } from "@/lib/buildables/PowerPole";
import { clientStore } from "@/lib/clientState";
import { AuthContext } from "@/auth.context";
import { AuthClient } from "@open-game-collective/auth-kit/client";

const meta: Meta<typeof Game> = {
  component: Game,
  decorators: [
    withActorKit<GameMachine>({
      actorType: "game",
      context: GameContext,
    }),
  ],
  parameters: {
    layout: "fullscreen",
    docs: {
      story: {
        autoplay: true,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Game>;

const PLAYER_ID = "fake-player-id";

const mockAuthClient: AuthClient = {
  getState: () => ({
    isLoading: false,
    host: "localhost:8787",
    userId: PLAYER_ID,
    sessionToken: "fake-session-token",
    refreshToken: "fake-refresh-token",
    isVerified: true,
    error: undefined,
  }),
  subscribe: () => () => {},
  requestCode: () => Promise.resolve(),
  verifyEmail: () => Promise.resolve({ success: true }),
  logout: () => Promise.resolve(),
  refresh: () => Promise.resolve(),
} as any as AuthClient;

export const Blank: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              number: 1,
              money: 10,
              powerSoldKWh: 0,
              isHost: true,
              blueprintsById: {
                coal_plant_small: {
                  id: "coal_plant_small",
                  type: "coal_plant",
                  name: "Small Coal Plant",
                  powerGenerationKW: 1000,
                  startingPrice: 10,
                },
              },
            },
          },
          time: {
            totalTicks: 0,
            isPaused: false,
          },
          auction: null,
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: {},
        value: "active",
      },
    });

    client.subscribe((snapshot) => {
      action("game-state-change")(snapshot);
    });

    await mount(
      <AuthContext.Provider client={mockAuthClient}>
        <GameContext.ProviderFromClient client={client}>
          <Game />
        </GameContext.ProviderFromClient>
      </AuthContext.Provider>
    );
  },
};

export const WithPowerLines: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              number: 1,
              money: 10,
              powerSoldKWh: 0,
              isHost: true,
              blueprintsById: {},
            },
          },
          time: {
            totalTicks: 10,
            isPaused: false,
          },
          auction: null,
          buildables: [
            createPowerPole({
              id: "power-pole-1",
              cornerCoordinates: {
                hex: { x: 10, z: 10 },
                position: CornerPosition.North,
              },
              playerId: PLAYER_ID,
              connectedToIds: [],
            }),
            createPowerPole({
              id: "power-pole-2",
              cornerCoordinates: {
                hex: { x: 10, z: 8 },
                position: CornerPosition.South,
              },
              playerId: PLAYER_ID,
              connectedToIds: ["power-pole-1"],
            }),
            createPowerPole({
              id: "power-pole-left-1",
              cornerCoordinates: {
                hex: { x: 9, z: 9 },
                position: CornerPosition.North,
              },
              playerId: PLAYER_ID,
              connectedToIds: ["power-pole-2"],
            }),
            createPowerPole({
              id: "power-pole-left-2",
              cornerCoordinates: {
                hex: { x: 9, z: 7 },
                position: CornerPosition.South,
              },
              playerId: PLAYER_ID,
              connectedToIds: ["power-pole-left-1"],
            }),
          ],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: {},
        value: "active",
      },
    });

    clientStore.send({ type: "setIsDebug", isDebug: true });

    await mount(
      <AuthContext.Provider client={mockAuthClient}>
        <GameContext.ProviderFromClient client={client}>
          <Game />
        </GameContext.ProviderFromClient>
      </AuthContext.Provider>
    );
  },
};

export const Auction: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              number: 1,
              money: 100,
              powerSoldKWh: 0,
              isHost: true,
              blueprintsById: {},
            },
          },
          time: {
            totalTicks: 0,
            isPaused: false,
          },
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          auction: {
            availableBlueprints: [
              {
                id: "coal_plant_small",
                type: "coal_plant",
                name: "Small Coal Plant",
                powerGenerationKW: 1000,
                startingPrice: 10,
              },
              {
                id: "coal_plant_medium",
                type: "coal_plant",
                name: "Medium Coal Plant",
                powerGenerationKW: 2000,
                startingPrice: 18,
                requiredState: "California",
              },
              {
                id: "coal_plant_large",
                type: "coal_plant",
                name: "Large Coal Plant",
                powerGenerationKW: 3000,
                startingPrice: 25,
                requiredState: "Texas",
              },
            ],
            currentBlueprint: null,
            purchases: [],
            passedPlayerIds: [],
            isPassingAllowed: true,
          },
        },
        private: {},
        value: { auction: "initiatingBid" },
      },
    });

    client.subscribe((snapshot) => {
      action("game-state-change")(snapshot);
    });

    clientStore.send({ type: "setIsDebug", isDebug: false });

    await mount(
      <AuthContext.Provider client={mockAuthClient}>
        <GameContext.ProviderFromClient client={client}>
          <Game />
        </GameContext.ProviderFromClient>
      </AuthContext.Provider>
    );
  },
};

export const AuctionWithCurrentBlueprint: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              number: 1,
              money: 100,
              powerSoldKWh: 0,
              isHost: true,
              blueprintsById: {},
            },
            "player-2": {
              name: "Player 2",
              number: 2,
              money: 100,
              powerSoldKWh: 1000,
              isHost: false,
              blueprintsById: {},
            },
            "player-3": {
              name: "Player 3",
              number: 3,
              money: 100,
              powerSoldKWh: 500,
              isHost: false,
              blueprintsById: {},
            },
          },
          time: {
            totalTicks: 0,
            isPaused: false,
          },
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          auction: {
            availableBlueprints: [
              {
                id: "coal_plant_medium",
                type: "coal_plant",
                name: "Medium Coal Plant",
                powerGenerationKW: 2000,
                startingPrice: 18,
                requiredState: "California",
              },
              {
                id: "coal_plant_large",
                type: "coal_plant",
                name: "Large Coal Plant",
                powerGenerationKW: 3000,
                startingPrice: 25,
                requiredState: "Texas",
              },
            ],
            currentBlueprint: {
              blueprint: {
                id: "coal_plant_small",
                type: "coal_plant",
                name: "Small Coal Plant",
                powerGenerationKW: 1000,
                startingPrice: 10,
              },
              bids: [
                {
                  playerId: PLAYER_ID,
                  amount: 10,
                },
                {
                  playerId: "player-2",
                  amount: 12,
                },
                {
                  playerId: "player-3",
                  passed: true,
                },
              ],
            },
            purchases: [],
            passedPlayerIds: ["player-3"],
            isPassingAllowed: true,
          },
        },
        private: {},
        value: { auction: "biddingOnBlueprint" },
      },
    });

    client.subscribe((snapshot) => {
      action("game-state-change")(snapshot);
    });

    await mount(
      <AuthContext.Provider client={mockAuthClient}>
        <GameContext.ProviderFromClient client={client}>
          <Game />
        </GameContext.ProviderFromClient>
      </AuthContext.Provider>
    );
  },
};

export const BuildablePlacementValidation: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              number: 1,
              money: 1000, // Plenty of money to build
              powerSoldKWh: 0,
              isHost: true,
              blueprintsById: {
                // Blueprint with California as required state
                california_plant: {
                  id: "california_plant",
                  type: "coal_plant",
                  name: "California Power Plant",
                  powerGenerationKW: 2000,
                  startingPrice: 20,
                  requiredState: "California",
                },
                // Blueprint with no required state
                generic_plant: {
                  id: "generic_plant",
                  type: "coal_plant",
                  name: "Generic Power Plant",
                  powerGenerationKW: 1000,
                  startingPrice: 10,
                },
              },
            },
          },
          time: {
            totalTicks: 0,
            isPaused: false,
          },
          auction: null,
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          // These properties are in the game.machine.ts but not in the types
          isDebug: false,
          mapBuilder: {
            isPaintbrushMode: false,
            selectedTerrainType: null,
            selectedPopulation: null,
          },
          commodityMarket: initializeCommodityMarket(),
        } as any, // Use type assertion to avoid TypeScript errors
        private: {},
        value: "active",
      },
    });

    client.subscribe((snapshot) => {
      action("game-state-change")(snapshot);
    });

    // Enable build mode for the California plant to test validation
    clientStore.send({
      type: "setBuildMode",
      mode: {
        type: "coal_plant",
        blueprintId: "california_plant",
      },
    });

    // Enable debug mode to see region names
    clientStore.send({ type: "setIsDebug", isDebug: true });

    await mount(
      <AuthContext.Provider client={mockAuthClient}>
        <GameContext.ProviderFromClient client={client}>
          <Game />
        </GameContext.ProviderFromClient>
      </AuthContext.Provider>
    );
  },
};

export const GridConnectivityValidation: Story = {
  play: async ({ canvasElement, mount }) => {
    // Create a client with an existing power plant and power poles
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              number: 1,
              money: 1000, // Plenty of money to build
              powerSoldKWh: 0,
              isHost: true,
              blueprintsById: {
                // Blueprint with no required state for additional plants
                generic_plant: {
                  id: "generic_plant",
                  type: "coal_plant",
                  name: "Generic Power Plant",
                  powerGenerationKW: 1000,
                  startingPrice: 10,
                },
              },
            },
            "player-2": {
              name: "Player 2",
              number: 2,
              money: 1000,
              powerSoldKWh: 0,
              isHost: false,
              blueprintsById: {
                generic_plant: {
                  id: "generic_plant",
                  type: "coal_plant",
                  name: "Generic Power Plant",
                  powerGenerationKW: 1000,
                  startingPrice: 10,
                },
              },
            },
          },
          time: {
            totalTicks: 0,
            isPaused: false,
          },
          auction: null,
          // Add an existing power plant and power poles for Player 1
          buildables: [
            {
              id: "existing-plant",
              type: "coal_plant",
              coordinates: { x: 10, z: 10 },
              playerId: PLAYER_ID,
              name: "Existing Power Plant",
              powerGenerationKW: 1000,
              pricePerKwh: 0.1,
              startingPrice: 10,
            },
            createPowerPole({
              id: "power-pole-1",
              cornerCoordinates: {
                hex: { x: 10, z: 10 },
                position: CornerPosition.North,
              },
              playerId: PLAYER_ID,
              connectedToIds: [],
            }),
            // Add a power plant for Player 2 in a different area
            {
              id: "player2-plant",
              type: "coal_plant",
              coordinates: { x: 20, z: 20 },
              playerId: "player-2",
              name: "Player 2 Power Plant",
              powerGenerationKW: 1000,
              pricePerKwh: 0.1,
              startingPrice: 10,
            },
            createPowerPole({
              id: "player2-pole",
              cornerCoordinates: {
                hex: { x: 20, z: 20 },
                position: CornerPosition.North,
              },
              playerId: "player-2",
              connectedToIds: [],
            }),
          ],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          // These properties are in the game.machine.ts but not in the types
          isDebug: false,
          mapBuilder: {
            isPaintbrushMode: false,
            selectedTerrainType: null,
            selectedPopulation: null,
          },
          commodityMarket: initializeCommodityMarket(),
        } as any, // Use type assertion to avoid TypeScript errors
        private: {},
        value: "active",
      },
    });

    client.subscribe((snapshot) => {
      action("game-state-change")(snapshot);
    });

    // Enable build mode for power poles to test grid connectivity validation
    clientStore.send({
      type: "setBuildMode",
      mode: {
        type: "power_pole",
      },
    });

    // Enable debug mode to see region names and grid connectivity
    clientStore.send({ type: "setIsDebug", isDebug: true });

    await mount(
      <AuthContext.Provider client={mockAuthClient}>
        <GameContext.ProviderFromClient client={client}>
          <Game />
        </GameContext.ProviderFromClient>
      </AuthContext.Provider>
    );
  },
};
