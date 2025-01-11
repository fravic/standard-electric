import { createActorKitContext } from "actor-kit/react";

import { GameMachine } from "./game.machine";

export const GameContext = createActorKitContext<GameMachine>("game");
export const GameProvider = GameContext.Provider;
