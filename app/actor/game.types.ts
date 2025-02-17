import { z } from "zod";
import {
  ActorKitSystemEvent,
  BaseActorKitEvent,
  WithActorKitEvent,
  WithActorKitInput,
} from "actor-kit";

import { Buildable } from "../lib/buildables/Buildable";
import { HexGrid } from "../lib/HexGrid";
import {
  GameClientEventSchema,
  GameInputSchema,
  GameServiceEventSchema,
} from "./game.schemas";
import { Env } from "../env";

export interface Player {
  name: string;
  money: number;
  powerSoldKWh: number;
  isHost: boolean;
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
