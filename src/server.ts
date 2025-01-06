import { createActorKitRouter } from "actor-kit/worker";
import { ExecutionContext } from "@cloudflare/workers-types";

import { GameServer } from "./actor/game.server";
import { Env } from "./actor/env";
export { GameServer as Game };

const router = createActorKitRouter(["game"]);

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.url.includes("/api/")) {
      return router(request, env, ctx);
    }

    return new Response("Hello World!");
  },
};
