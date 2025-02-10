import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";

import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { Game } from "@/components/Game";
import { HexGrid } from "@/lib/HexGrid";

import hexGrid from "@/../public/hexgrid.json";
import { CornerPosition } from "@/lib/coordinates/types";
import { createPowerPole } from "@/lib/buildables/PowerPole";
import { clientStore } from "@/lib/clientState";

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
  },
};

export default meta;
type Story = StoryObj<typeof Game>;

const PLAYER_ID = "fake-player-id";

export const Blank: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              money: 10,
              powerSoldKWh: 0,
            },
          },
          time: {
            totalTicks: 0,
            isPaused: false,
          },
          buildables: [],
          hexGrid: hexGrid as HexGrid,
        },
        private: {},
        value: "active",
      },
    });

    client.subscribe((snapshot) => {
      action("game-state-change")(snapshot);
    });

    await mount(
      <GameContext.ProviderFromClient client={client}>
        <Game />
      </GameContext.ProviderFromClient>
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
              money: 10,
              powerSoldKWh: 0,
            },
          },
          time: {
            totalTicks: 10,
            isPaused: false,
          },
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
        },
        private: {},
        value: "active",
      },
    });

    clientStore.send({ type: "setIsDebug", isDebug: true });

    await mount(
      <GameContext.ProviderFromClient client={client}>
        <Game />
      </GameContext.ProviderFromClient>
    );
  },
};
