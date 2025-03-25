import { z } from "zod";
import {
  ActorKitSystemEvent,
  BaseActorKitEvent,
  WithActorKitEvent,
  WithActorKitInput,
} from "actor-kit";

import { HexGrid } from "../lib/HexGrid";
import { GameClientEventSchema, GameInputSchema, GameServiceEventSchema } from "./game.schemas";
import { Env } from "../env";
import { CommodityMarketState } from "../ecs/systems/CommoditySystem";
import { Entity } from "../ecs/entity";
import { HexCellResource } from "@/ecs/systems/SurveySystem";

export interface Player {
  name: string;
  number: number;
  money: number;
  powerSoldKWh: number;
  isHost: boolean;
  color: string; // Player's color, assigned based on player number
}

// No longer need AuctionBlueprint interface as we'll use Entity directly

export interface Auction {
  availableBlueprintIds: string[];
  currentBlueprint: null | {
    blueprintId: string;
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
  entitiesById: Record<string, Entity>;
  hexGrid: HexGrid;
  auction: Auction | null;
  randomSeed: number;
  commodityMarket: CommodityMarketState;
}

export type GamePrivateContext = {
  entitiesById: Record<string, Entity>;
  hexCellResources?: Record<string, HexCellResource>; // Only used by SERVER_ONLY_ID
};

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
