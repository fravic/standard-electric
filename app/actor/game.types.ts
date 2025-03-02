import { z } from "zod";
import {
  ActorKitSystemEvent,
  BaseActorKitEvent,
  WithActorKitEvent,
  WithActorKitInput,
} from "actor-kit";

import { Buildable, PowerPlantBlueprint } from "../lib/buildables/schemas";
import { HexGrid } from "../lib/HexGrid";
import {
  GameClientEventSchema,
  GameInputSchema,
  GameServiceEventSchema,
} from "./game.schemas";
import { Env } from "../env";
import { CommodityMarketState } from "../lib/market/CommodityMarket";

export interface Player {
  name: string;
  number: number;
  money: number;
  powerSoldKWh: number;
  isHost: boolean;
  blueprintsById: Record<string, PowerPlantBlueprint>;
}

export interface Auction {
  availableBlueprints: PowerPlantBlueprint[];
  currentBlueprint: null | {
    blueprint: PowerPlantBlueprint;
    bids: {
      playerId: string;
      amount?: number;
      passed?: boolean;
    }[];
  };
  purchases: {
    playerId: string;
    blueprintId: string;
    price: number;
  }[];
  isPassingAllowed: boolean;
  passedPlayerIds: string[];
}

interface GamePublicContext {
  id: string;
  players: {
    [playerId: string]: Player;
  };
  time: {
    totalTicks: number;
    isPaused: boolean;
  };
  buildables: Buildable[];
  hexGrid: HexGrid;
  auction: Auction | null;
  randomSeed: number;
  commodityMarket: CommodityMarketState;
}

export type GamePrivateContext = {};

export type GameContext = {
  public: GamePublicContext;
  private: Record<string, GamePrivateContext>;
};

export type GameEvent = (
  | WithActorKitEvent<z.infer<typeof GameClientEventSchema>, "client">
  | WithActorKitEvent<z.infer<typeof GameServiceEventSchema>, "service">
  | ActorKitSystemEvent
) &
  BaseActorKitEvent<Env>;

export type GameInputProps = z.infer<typeof GameInputSchema>;
export type GameInput = WithActorKitInput<GameInputProps, Env>;
