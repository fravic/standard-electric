import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";

import { Game } from "../components/Game";
import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { HexGrid } from "@/lib/HexGrid";
import { PLAYER_ID } from "@/lib/constants";

import hexGrid from "@/../public/hexgrid.json";

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

export const Interactive: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          isDebug: true,
          mapBuilder: {
            isPaintbrushMode: false,
            selectedTerrainType: null,
            selectedPopulation: null,
          },
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              money: 10,
              buildMode: null,
              hoverLocation: null,
              selectedHexCoordinates: null,
            },
          },
          time: {
            totalTicks: 0,
            isPaused: true,
          },
          buildables: [],
          hexGrid: hexGrid as HexGrid,
        },
        private: {},
        value: { game: "ready" },
      },
    });

    await mount(
      <GameContext.ProviderFromClient client={client}>
        <Game />
      </GameContext.ProviderFromClient>
    );
  },
};
