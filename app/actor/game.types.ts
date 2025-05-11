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
  id: string;
  name: string;
  number: number;
  money: number;
  powerSoldKWh: number;
  isHost: boolean;
  color: string; // Player's color, assigned based on player number
}

export interface Auction {
  // No longer need Auction interface as we'll use Entity directly
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
