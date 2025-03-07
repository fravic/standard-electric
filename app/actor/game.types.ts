import { z } from "zod";
import {
  ActorKitSystemEvent,
  BaseActorKitEvent,
  WithActorKitEvent,
  WithActorKitInput,
} from "actor-kit";

import { PowerPlantBlueprint } from "../lib/buildables/schemas";
import { HexGrid } from "../lib/HexGrid";
import {
  GameClientEventSchema,
  GameInputSchema,
  GameServiceEventSchema,
} from "./game.schemas";
import { Env } from "../env";
import { CommodityMarketState } from "../lib/market/CommodityMarket";
import { SurveyResult, HexCellResource } from "../lib/surveys";
import { Entity } from "../ecs/entity";

export interface Player {
  name: string;
  number: number;
  money: number;
  powerSoldKWh: number;
  isHost: boolean;
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
  entitiesById: Record<string, Entity>;
  hexGrid: HexGrid;
  auction: Auction | null;
  randomSeed: number;
  commodityMarket: CommodityMarketState;
}

export type GamePrivateContext = {
  surveyResultByHexCell: Record<string, SurveyResult>; // Key is hex coordinates string
  hexCellResources?: Record<string, HexCellResource | null>; // Only used by SERVER_ONLY_ID
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
