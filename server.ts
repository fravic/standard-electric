import { createActorKitRouter } from "actor-kit/worker";

import { WorkerEntrypoint } from "cloudflare:workers";
import { GameServer } from "./app/actor/game.server";
import { Env } from "./app/env";
export { Remix } from "./app/remix.server";
export { GameServer as Game };

const router = createActorKitRouter(["game"]);

export default class Worker extends WorkerEntrypoint<Env> {
  fetch(request: Request): Promise<Response> | Response {
    if (request.url.includes("/api/")) {
      return router(request, this.env, this.ctx);
    }

    const id = this.env.REMIX.idFromName("default");
    return this.env.REMIX.get(id).fetch(request);
  }
}
