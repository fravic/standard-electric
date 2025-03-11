import { merge } from "lodash";

import { HexGridSchema } from "@/lib/HexGrid";
import { GameContext, GameInput, Player, GamePrivateContext } from "./game.types";
import { Entity } from "@/ecs/entity";
import hexGridData from "../../public/hexgrid.json";
import { initializeCommodityMarket } from "@/ecs/systems/CommoditySystem";

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export function createDefaultContext(
  input: GameInput,
  overrides: DeepPartial<GameContext>
): GameContext {
  return merge(
    {},
    {
      public: {
        id: input.id,
        players: {} as Record<string, Player>,
        time: {
          totalTicks: 0,
          isPaused: true,
        },
        entitiesById: {} as Record<string, Entity>,
        hexGrid: HexGridSchema.parse(hexGridData),
        auction: null,
        randomSeed: input.randomSeed ?? Math.floor(Math.random() * 1000000),
        commodityMarket: initializeCommodityMarket(),
      },
      private: {} as Record<string, GamePrivateContext>,
    },
    overrides
  );
}
