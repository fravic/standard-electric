import { WorkerEntrypoint } from "cloudflare:workers";
import { createActorKitRouter } from "actor-kit/worker";

import { Env } from "./env";
export { GameServer as Game } from "./actor/game.server";
export { Remix } from "./remix.server";

const actorKitRouter = createActorKitRouter(["game"]);

export default class Worker extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    const url = new URL(request.url);

    // If the path starts with /api/actor-type/..., use ActorKit router
    console.log("Handling request", { pathname: url.pathname });
    if (request.url.includes("/api/")) {
      return actorKitRouter(request, this.env, this.ctx);
    }

    // Otherwise, use the Remix Durable Object
    const id = this.env.REMIX.idFromName("default");
    return this.env.REMIX.get(id).fetch(request);
  }
}
