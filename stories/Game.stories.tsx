import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";
import { nanoid } from "nanoid";

import { createSurvey } from "@/ecs/factories";
import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { Game } from "@/components/Game";
import { HexGrid } from "@/lib/HexGrid";
import { initializeCommodityMarket } from "@/ecs/systems/CommoditySystem";
import { CommodityType } from "@/lib/types";
import { getPlayerColor } from "@/lib/constants";

import hexGrid from "@/../public/hexgrid.json";
import { CornerPosition } from "@/lib/coordinates/types";
import { clientStore } from "@/lib/clientState";
import { AuthContext } from "@/auth.context";
import { AuthClient } from "@open-game-collective/auth-kit/client";
import { WorldContextProvider } from "@/components/WorldContext";
import { coordinatesToString, createHexCoordinates } from "@/lib/coordinates/HexCoordinates";
import { GamePrivateContext } from "@/actor/game.types";
import { Entity } from "@/ecs/entity";
import {
  createPowerPole,
  createPowerPlant,
  createPowerPlantBlueprint,
  createWorldWithEntities,
  createPowerPoleBlueprint,
} from "@/ecs/factories";
import { IonWrapper } from "@/components/IonWrapper";

const meta: Meta<typeof Game> = {
  component: Game,
  decorators: [
    withActorKit<GameMachine>({
      actorType: "game",
      context: GameContext,
    }),
    (Story) => (
      <IonWrapper>
        <Story />
      </IonWrapper>
    ),
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
    id,
    number,
    money,
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
        <WorldContextProvider>
          <Game />
        </WorldContextProvider>
      </GameContext.ProviderFromClient>
    </AuthContext.Provider>
  );
};

export const Blank: Story = {
  play: async ({ canvasElement, mount }) => {
    // Create the client with empty entities
    const entities: Record<string, Entity> = {};
    const world = createWorldWithEntities(entities, {});

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
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: entities,
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
    // Create a client with multiple players and blueprints
    const genericPlant = createPowerPlantBlueprint({
      id: "generic_plant",
      name: "Generic Power Plant",
      playerId: PLAYER_2_ID,
      powerGenerationKW: 1000,
      pricePerKWh: 10,
      startingPrice: 10,
    });

    const entities: Record<string, Entity> = {
      [genericPlant.id]: genericPlant,
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 1000, true),
            [PLAYER_2_ID]: createPlayer(PLAYER_2_ID, "Player 2", 2, 1000),
          },
          time: { totalTicks: 0, isPaused: false },
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: entities,
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
    const powerPole1 = createPowerPole({
      id: "power-pole-1",
      cornerCoordinates: {
        hex: { x: 10, z: 10 },
        position: CornerPosition.North,
      },
      playerId: PLAYER_ID,
      connectedToIds: [],
    });

    const powerPole2 = createPowerPole({
      id: "power-pole-2",
      cornerCoordinates: {
        hex: { x: 10, z: 8 },
        position: CornerPosition.South,
      },
      playerId: PLAYER_ID,
      connectedToIds: ["power-pole-1"],
    });

    const powerPoleLeft1 = createPowerPole({
      id: "power-pole-left-1",
      cornerCoordinates: {
        hex: { x: 9, z: 9 },
        position: CornerPosition.North,
      },
      playerId: PLAYER_ID,
      connectedToIds: ["power-pole-2"],
    });

    const powerPoleLeft2 = createPowerPole({
      id: "power-pole-left-2",
      cornerCoordinates: {
        hex: { x: 9, z: 7 },
        position: CornerPosition.South,
      },
      playerId: PLAYER_ID,
      connectedToIds: ["power-pole-left-1"],
    });

    const entities: Record<string, Entity> = {
      [powerPole1.id]: powerPole1,
      [powerPole2.id]: powerPole2,
      [powerPoleLeft1.id]: powerPoleLeft1,
      [powerPoleLeft2.id]: powerPoleLeft2,
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 100, true),
          },
          time: { totalTicks: 10, isPaused: false },
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: entities,
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    await mountGame(mount, client);
  },
};

export const BuildablePlacementInCalifornia: Story = {
  play: async ({ canvasElement, mount }) => {
    const californiaPlant = createPowerPlantBlueprint({
      id: "california_plant",
      name: "California Power Plant",
      playerId: PLAYER_ID,
      powerGenerationKW: 2000,
      pricePerKWh: 20,
      startingPrice: 20,
      requiredRegionName: "California",
    });

    const genericPlant = createPowerPlantBlueprint({
      id: "generic_plant",
      name: "Generic Power Plant",
      playerId: PLAYER_ID,
      powerGenerationKW: 1000,
      pricePerKWh: 10,
      startingPrice: 10,
    });

    // Create survey results for the player
    const surveyResultEntities: Entity[] = [
      createSurvey({
        id: nanoid(),
        hexCoordinates: createHexCoordinates(3, 11),
        surveyStartTick: 0,
        isComplete: true,
        playerId: PLAYER_ID,
      }),
      createSurvey({
        id: nanoid(),
        hexCoordinates: createHexCoordinates(4, 11),
        surveyStartTick: 0,
        isComplete: true,
        playerId: PLAYER_ID,
      }),
    ];

    const entities: Record<string, Entity> = {
      [californiaPlant.id]: californiaPlant,
      [genericPlant.id]: genericPlant,
      ...surveyResultEntities.reduce(
        (acc, entity) => {
          acc[entity.id] = entity;
          return acc;
        },
        {} as Record<string, Entity>
      ),
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 1000, true),
          },
          time: { totalTicks: 10, isPaused: false },
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: entities,
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    // Enable build mode for the California plant to test validation
    clientStore.send({
      type: "setBuildMode",
      mode: {
        blueprintId: "california_plant",
      },
    });

    await mountGame(mount, client);
  },
};

export const GridConnectivityValidation: Story = {
  play: async ({ canvasElement, mount }) => {
    // Create power plant for Player 1
    const existingPlant = createPowerPlant({
      id: "existing-plant",
      name: "Existing Power Plant",
      hexCoordinates: { x: 10, z: 10 },
      playerId: PLAYER_ID,
      powerGenerationKW: 1000,
      pricePerKWh: 0.1,
      maxFuelStorage: 1000,
      currentFuelStorage: 500,
    });

    // Create power pole for Player 1
    const powerPole1 = createPowerPole({
      id: "power-pole-1",
      cornerCoordinates: {
        hex: { x: 10, z: 10 },
        position: CornerPosition.North,
      },
      playerId: PLAYER_ID,
      connectedToIds: [],
    });

    // Create power plant for Player 2
    const player2Plant = createPowerPlant({
      id: "player2-plant",
      name: "Player 2 Power Plant",
      hexCoordinates: { x: 20, z: 20 },
      playerId: PLAYER_2_ID,
      powerGenerationKW: 1000,
      pricePerKWh: 0.1,
      maxFuelStorage: 1000,
      currentFuelStorage: 500,
    });

    // Create power pole for Player 2
    const player2Pole = createPowerPole({
      id: "player2-pole",
      cornerCoordinates: {
        hex: { x: 20, z: 20 },
        position: CornerPosition.North,
      },
      playerId: PLAYER_2_ID,
      connectedToIds: [],
    });

    // Create generic plant blueprint for players
    const genericPlant = createPowerPlantBlueprint({
      id: "generic_plant",
      name: "Generic Power Plant",
      playerId: PLAYER_ID,
      powerGenerationKW: 1000,
      pricePerKWh: 10,
      startingPrice: 10,
    });

    // Create player 2's copy of the blueprint
    const player2GenericPlant = createPowerPlantBlueprint({
      id: "generic_plant-player2",
      name: "Generic Power Plant",
      playerId: PLAYER_2_ID,
      powerGenerationKW: 1000,
      pricePerKWh: 10,
      startingPrice: 10,
    });

    // Create a power pole blueprint for player 1
    const powerPoleBlueprint = createPowerPoleBlueprint(PLAYER_ID);

    const entities: Record<string, Entity> = {
      [existingPlant.id]: existingPlant,
      [powerPole1.id]: powerPole1,
      [player2Plant.id]: player2Plant,
      [player2Pole.id]: player2Pole,
      [genericPlant.id]: genericPlant,
      [player2GenericPlant.id]: player2GenericPlant,
      [powerPoleBlueprint.id]: powerPoleBlueprint,
    };

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: createPlayer(PLAYER_ID, "Player 1", 1, 1000, true),
            [PLAYER_2_ID]: createPlayer(PLAYER_2_ID, "Player 2", 2, 1000),
          },
          time: { totalTicks: 0, isPaused: false },
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: entities,
        },
        private: createEmptyPrivateContext(),
        value: "active",
      },
    });

    // Enable build mode for power poles to test grid connectivity validation
    clientStore.send({
      type: "setBuildMode",
      mode: {
        blueprintId: powerPoleBlueprint.id,
      },
    });

    await mountGame(mount, client);
  },
};

export const WithCommodityMarket: Story = {
  name: "With Commodity Market",
  play: async ({ canvasElement, mount }) => {
    // Create power plants with different fuel types
    const coalPlant = createPowerPlant({
      id: "coal-plant-1",
      name: "Coal Power Plant",
      hexCoordinates: createHexCoordinates(5, 5),
      playerId: PLAYER_ID,
      powerGenerationKW: 2000,
      pricePerKWh: 0.12,
      maxFuelStorage: 1000,
      fuelType: CommodityType.COAL,
      currentFuelStorage: 350,
    });

    const oilPlant = createPowerPlant({
      id: "oil-plant-1",
      name: "Oil Power Plant",
      hexCoordinates: createHexCoordinates(10, 10),
      playerId: PLAYER_2_ID,
      powerGenerationKW: 1500,
      fuelType: CommodityType.OIL,
      pricePerKWh: 0.15,
    });

    const gasPlant = createPowerPlant({
      id: "gas-plant-1",
      name: "Gas Power Plant",
      hexCoordinates: createHexCoordinates(15, 15),
      playerId: PLAYER_ID,
      powerGenerationKW: 1800,
      pricePerKWh: 0.18,
      maxFuelStorage: 1000,
      fuelType: CommodityType.GAS,
      currentFuelStorage: 300,
    });

    const entities: Record<string, Entity> = {
      [coalPlant.id]: coalPlant,
      [oilPlant.id]: oilPlant,
      [gasPlant.id]: gasPlant,
    };
    console.log({ entities });

    // Create a player with power sold
    const player1 = createPlayer(PLAYER_ID, "Player 1", 1, 1500, true);
    player1.powerSoldKWh = 100;

    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: player1,
            [PLAYER_2_ID]: createPlayer(PLAYER_2_ID, "Player 2", 2, 1000),
          },
          time: { totalTicks: 24, isPaused: false }, // Set to day 2
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
          entitiesById: entities,
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
    const surveyResultEntities: Entity[] = [
      createSurvey({
        id: nanoid(),
        hexCoordinates: completedSurveyCoord1,
        surveyStartTick: currentTick - 15,
        isComplete: true,
        playerId: PLAYER_ID,
        resource: {
          resourceType: CommodityType.COAL,
          resourceAmount: 120,
        },
      }),
      createSurvey({
        id: nanoid(),
        hexCoordinates: completedSurveyCoord2,
        surveyStartTick: currentTick - 12,
        isComplete: true,
        playerId: PLAYER_ID,
        resource: {
          resourceType: CommodityType.OIL,
          resourceAmount: 80,
        },
      }),
      createSurvey({
        id: nanoid(),
        hexCoordinates: completedSurveyCoord3,
        surveyStartTick: currentTick - 11,
        isComplete: true,
        resource: undefined,
        playerId: PLAYER_ID,
      }),
      createSurvey({
        id: nanoid(),
        hexCoordinates: inProgressSurveyCoord,
        surveyStartTick: currentTick - 1,
        isComplete: false,
        playerId: PLAYER_ID,
      }),
    ];

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
          entitiesById: {},
          hexGrid: hexGrid as HexGrid,
          randomSeed: 123,
          commodityMarket: initializeCommodityMarket(),
        },
        private: {
          hexCellResources,
          entitiesById: surveyResultEntities.reduce(
            (acc, entity) => {
              acc[entity.id] = entity;
              return acc;
            },
            {} as Record<string, Entity>
          ),
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
