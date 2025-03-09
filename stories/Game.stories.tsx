import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";

import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { Game } from "@/components/Game";
import { HexGrid } from "@/lib/HexGrid";
import {
  initializeCommodityMarket,
  CommodityType,
} from "@/lib/market/CommodityMarket";

import hexGrid from "@/../public/hexgrid.json";
import { CornerPosition } from "@/lib/coordinates/types";
import { clientStore } from "@/lib/clientState";
import { AuthContext } from "@/auth.context";
import { AuthClient } from "@open-game-collective/auth-kit/client";
import {
  coordinatesToString,
  createHexCoordinates,
} from "@/lib/coordinates/HexCoordinates";
import { GamePrivateContext } from "@/actor/game.types";
import { SurveyResult } from "@/lib/surveys";

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
const PLAYER_2_ID = "player-2";
const PLAYER_3_ID = "player-3";
const SERVER_ONLY_ID = "__SERVER_ONLY__";

// Create a basic player object to reduce repetition
const createPlayer = (
  id: string,
  name: string,
  number: number,
  money: number = 100,
  isHost: boolean = false
) => {
  return {
    name,
    number,
    money,
    powerSoldKWh: 0,
    isHost,
    blueprintsById: {},
  };
};

// Create a default empty private context
const createEmptyPrivateContext = (): GamePrivateContext => {
  return {
    surveyResultByHexCell: {},
  };
};

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

// Helper function to mount the game component
const mountGame = async (
  mount: any,
  client: any,
  { isDebug = false }: { isDebug?: boolean } = {}
) => {
  clientStore.send({ type: "setIsDebug", isDebug });

  client.subscribe((snapshot: any) => {
    action("game-state-change")(snapshot);
  });

  await mount(
    <AuthContext.Provider client={mockAuthClient}>
      <GameContext.ProviderFromClient client={client}>
        <Game />
      </GameContext.ProviderFromClient>
    </AuthContext.Provider>
  );
};

export const Blank: Story = {
  play: async ({ canvasElement, mount }) => {
    // Add a blueprint to the player
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              ...createPlayer(PLAYER_ID, "Player 1", 1, 10, true),
            },
          },
          time: { totalTicks: 0, isPaused: false },
          auction: null,
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    await mountGame(mount, client);
  },
};

export const DebugMode: Story = {
  play: async ({ canvasElement, mount }) => {
    // Create a client with multiple players
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 1000, true),
            [PLAYER_2_ID]: {
              ...createPlayer(PLAYER_2_ID, "Player 2", 2, 1000),
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
          time: { totalTicks: 0, isPaused: false },
          auction: null,
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    await mountGame(mount, client, { isDebug: true });
  },
};

export const WithPowerLines: Story = {
  play: async ({ canvasElement, mount }) => {
    const buildables = [
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
    ];

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 100, true),
          },
          time: { totalTicks: 10, isPaused: false },
          auction: null,
          buildables,
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    await mountGame(mount, client);
  },
};

export const Auction: Story = {
  play: async ({ canvasElement, mount }) => {
    const auction = {
      availableBlueprints: [
        {
          id: "coal_plant_small",
          type: "coal_plant" as const,
          name: "Small Coal Plant",
          powerGenerationKW: 1000,
          startingPrice: 10,
        },
        {
          id: "coal_plant_medium",
          type: "coal_plant" as const,
          name: "Medium Coal Plant",
          powerGenerationKW: 2000,
          startingPrice: 18,
          requiredState: "California",
        },
        {
          id: "coal_plant_large",
          type: "coal_plant" as const,
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
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 100, true),
          },
          time: { totalTicks: 0, isPaused: false },
          auction,
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: createEmptyPrivateContext(),
        value: { auction: "initiatingBid" },
      },
    });

    await mountGame(mount, client);
  },
};

export const AuctionWithCurrentBlueprint: Story = {
  play: async ({ canvasElement, mount }) => {
    const auction = {
      availableBlueprints: [
        {
          id: "coal_plant_medium",
          type: "coal_plant" as const,
          name: "Medium Coal Plant",
          powerGenerationKW: 2000,
          startingPrice: 18,
          requiredState: "California",
        },
        {
          id: "coal_plant_large",
          type: "coal_plant" as const,
          name: "Large Coal Plant",
          powerGenerationKW: 3000,
          startingPrice: 25,
          requiredState: "Texas",
        },
      ],
      currentBlueprint: {
        blueprint: {
          id: "coal_plant_small",
          type: "coal_plant" as const,
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
            playerId: PLAYER_2_ID,
            amount: 12,
          },
          {
            playerId: PLAYER_3_ID,
            passed: true,
          },
        ],
      },
      purchases: [],
      passedPlayerIds: [PLAYER_3_ID],
      isPassingAllowed: true,
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 100, true),
            [PLAYER_2_ID]: {
              ...createPlayer(PLAYER_2_ID, "Player 2", 2, 100),
              powerSoldKWh: 1000,
            },
            [PLAYER_3_ID]: {
              ...createPlayer(PLAYER_3_ID, "Player 3", 3, 100),
              powerSoldKWh: 500,
            },
          },
          time: { totalTicks: 0, isPaused: false },
          auction,
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: createEmptyPrivateContext(),
        value: { auction: "biddingOnBlueprint" },
      },
    });

    await mountGame(mount, client);
  },
};

export const BuildablePlacementInCalifornia: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              ...createPlayer(PLAYER_ID, "Player 1", 1, 1000, true),
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
          time: { totalTicks: 0, isPaused: false },
          auction: null,
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    // Enable build mode for the California plant to test validation
    clientStore.send({
      type: "setBuildMode",
      mode: {
        type: "coal_plant",
        blueprintId: "california_plant",
      },
    });

    await mountGame(mount, client);
  },
};

export const GridConnectivityValidation: Story = {
  play: async ({ canvasElement, mount }) => {
    const buildables = [
      // Add an existing power plant and power poles for Player 1
      {
        id: "existing-plant",
        type: "coal_plant" as const,
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
        type: "coal_plant" as const,
        coordinates: { x: 20, z: 20 },
        playerId: PLAYER_2_ID,
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
        playerId: PLAYER_2_ID,
        connectedToIds: [],
      }),
    ];

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              ...createPlayer(PLAYER_ID, "Player 1", 1, 1000, true),
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
            [PLAYER_2_ID]: {
              ...createPlayer(PLAYER_2_ID, "Player 2", 2, 1000),
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
          time: { totalTicks: 0, isPaused: false },
          auction: null,
          buildables,
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    // Enable build mode for power poles to test grid connectivity validation
    clientStore.send({
      type: "setBuildMode",
      mode: {
        type: "power_pole",
      },
    });

    await mountGame(mount, client);
  },
};

export const WithCommodityMarket: Story = {
  name: "With Commodity Market",
  play: async ({ canvasElement, mount }) => {
    // Create power plants with different fuel types
    const coalPlant: PowerPlant = {
      id: "coal-plant-1",
      type: "coal_plant",
      name: "Coal Power Plant",
      coordinates: createHexCoordinates(5, 5),
      playerId: PLAYER_ID,
      powerGenerationKW: 2000,
      pricePerKwh: 0.12,
      startingPrice: 15,
      fuelType: CommodityType.COAL,
      fuelConsumptionPerKWh: 0.1,
      maxFuelStorage: 1000,
      currentFuelStorage: 350,
    };

    const oilPlant: PowerPlant = {
      id: "oil-plant-1",
      type: "coal_plant", // Using coal_plant type but with oil fuel
      name: "Oil Power Plant",
      coordinates: createHexCoordinates(10, 10),
      playerId: PLAYER_2_ID,
      powerGenerationKW: 1500,
      pricePerKwh: 0.15,
      startingPrice: 18,
      fuelType: CommodityType.OIL,
      fuelConsumptionPerKWh: 0.08,
      maxFuelStorage: 800,
      currentFuelStorage: 200,
    };

    const gasPlant: PowerPlant = {
      id: "gas-plant-1",
      type: "coal_plant", // Using coal_plant type but with gas fuel
      name: "Gas Power Plant",
      coordinates: createHexCoordinates(15, 15),
      playerId: PLAYER_ID,
      powerGenerationKW: 1800,
      pricePerKwh: 0.14,
      startingPrice: 20,
      fuelType: CommodityType.GAS,
      fuelConsumptionPerKWh: 0.07,
      maxFuelStorage: 600,
      currentFuelStorage: 300,
    };

    const buildables = [coalPlant, oilPlant, gasPlant];

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              ...createPlayer(PLAYER_ID, "Player 1", 1, 1500, true),
              powerSoldKWh: 100,
            },
            [PLAYER_2_ID]: createPlayer(PLAYER_2_ID, "Player 2", 2, 1000),
          },
          time: { totalTicks: 24, isPaused: false }, // Set to day 2
          auction: null,
          buildables,
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    await mountGame(mount, client);
  },
};

export const WithSurveys: Story = {
  name: "With Surveys",
  play: async ({ canvasElement, mount }) => {
    // Create coordinates for surveyed and in-progress survey cells
    const completedSurveyCoord1 = createHexCoordinates(5, 5);
    const completedSurveyCoord2 = createHexCoordinates(6, 5);
    const completedSurveyCoord3 = createHexCoordinates(7, 5);
    const inProgressSurveyCoord = createHexCoordinates(8, 5);

    // Current game tick
    const currentTick = 30;

    // Create survey results for the player
    const surveyResultByHexCell: Record<string, SurveyResult> = {
      // Completed survey with coal resource
      [coordinatesToString(completedSurveyCoord1)]: {
        surveyStartTick: currentTick - 15,
        isComplete: true,
        resource: {
          resourceType: CommodityType.COAL,
          resourceAmount: 120,
        },
      },
      // Completed survey with oil resource
      [coordinatesToString(completedSurveyCoord2)]: {
        surveyStartTick: currentTick - 12,
        isComplete: true,
        resource: {
          resourceType: CommodityType.OIL,
          resourceAmount: 80,
        },
      },
      // Completed survey with no resource
      [coordinatesToString(completedSurveyCoord3)]: {
        surveyStartTick: currentTick - 11,
        isComplete: true,
        resource: undefined,
      },
      // Survey in progress (5 ticks in, 50% complete)
      [coordinatesToString(inProgressSurveyCoord)]: {
        surveyStartTick: currentTick - 5,
        isComplete: false,
      },
    };

    // Create server-side resources (ground truth)
    const hexCellResources = {
      [coordinatesToString(completedSurveyCoord1)]: {
        resourceType: CommodityType.COAL,
        resourceAmount: 120,
      },
      [coordinatesToString(completedSurveyCoord2)]: {
        resourceType: CommodityType.OIL,
        resourceAmount: 80,
      },
      [coordinatesToString(completedSurveyCoord3)]: null, // No resource
      [coordinatesToString(inProgressSurveyCoord)]: {
        resourceType: CommodityType.GAS,
        resourceAmount: 60,
      },
      // Add some undiscovered resources
      [coordinatesToString(createHexCoordinates(9, 5))]: {
        resourceType: CommodityType.URANIUM,
        resourceAmount: 40,
      },
      [coordinatesToString(createHexCoordinates(10, 5))]: {
        resourceType: CommodityType.COAL,
        resourceAmount: 100,
      },
    };

    // Create a custom game state for the survey story with private context
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 100, true),
            [PLAYER_2_ID]: createPlayer(PLAYER_2_ID, "Player 2", 2, 100),
          },
          time: { totalTicks: currentTick, isPaused: false },
          auction: null,
          buildables: [],
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: {
          surveyResultByHexCell,
          hexCellResources,
        },
        value: "active",
      },
    });

    // Select a hex with a completed survey to show the survey results
    clientStore.send({
      type: "selectHex",
      coordinates: completedSurveyCoord1,
    });

    await mountGame(mount, client);
  },
};
