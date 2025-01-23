import { action } from "@storybook/addon-actions";
import type { Meta, StoryObj } from "@storybook/react";
import { withActorKit } from "actor-kit/storybook";
import { createActorKitMockClient } from "actor-kit/test";

import { GameContext } from "@/actor/game.context";
import { GameMachine } from "@/actor/game.machine";
import { Game } from "@/components/Game";
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

export const Entry: Story = {
  play: async ({ canvasElement, mount }) => {
    const client = createActorKitMockClient<GameMachine>({
      initialSnapshot: {
        public: {
          id: "game-123",
          players: {
            [PLAYER_ID]: {
              name: "Player 1",
              money: 10,
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
