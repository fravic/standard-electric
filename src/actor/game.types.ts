import { z } from "zod";
import {
  ActorKitSystemEvent,
  BaseActorKitEvent,
  WithActorKitEvent,
  WithActorKitInput,
} from "actor-kit";

import { Buildable, BuildableType } from "../lib/buildables/Buildable";
import { Population, TerrainType } from "../lib/HexCell";
import { HexCoordinates } from "../lib/coordinates/HexCoordinates";
import { HexGrid } from "../lib/HexGrid";
import {
  GameClientEventSchema,
  GameInputSchema,
  GameServiceEventSchema,
} from "./game.schemas";
import { Env } from "./env";

export type BuildMode = null | {
  type: BuildableType;
};

interface Player {
  name: string;
  money: number;
  buildMode: BuildMode;
  hoverLocation: {
    worldPoint: [number, number, number];
  } | null;
  selectedHexCoordinates: HexCoordinates | null;
}

interface MapBuilder {
  isPaintbrushMode: boolean;
  selectedTerrainType: TerrainType | null;
  selectedPopulation: Population | null;
}

interface GamePublicContext {
  id: string;
  isDebug: boolean;
  mapBuilder: MapBuilder;
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
