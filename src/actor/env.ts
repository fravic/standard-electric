import { AnyActorServer } from "actor-kit";
import { GameServer } from "./game.server";

export interface Env {
  GAME: DurableObjectNamespace<GameServer>;
  ACTOR_KIT_SECRET: string;
  ACTOR_KIT_HOST: string;
  [key: string]: DurableObjectNamespace<AnyActorServer> | unknown;
}
