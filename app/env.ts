import { AnyActorServer } from "actor-kit";
import { GameServer } from "./actor/game.server";
import { Remix } from "./remix.server";

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    env: Env;
    userId: string;
    sessionId: string;
    pageSessionId: string;
  }
}

export interface Env {
  GAME: DurableObjectNamespace<GameServer>;
  REMIX: DurableObjectNamespace<Remix>;
  ACTOR_KIT_SECRET: string;
  ACTOR_KIT_HOST: string;
  SESSION_JWT_SECRET: string;
  [key: string]: DurableObjectNamespace<AnyActorServer> | unknown;

  // Required for auth-kit
  AUTH_SECRET: string;
  SENDGRID_API_KEY: string;

  // KV Storage for auth data
  KV_STORAGE: KVNamespace;
}
