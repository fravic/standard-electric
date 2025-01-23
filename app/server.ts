import { logDevReady } from "@remix-run/cloudflare";
import * as build from "@remix-run/dev/server-build";
import { createActorKitRouter } from "actor-kit/worker";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Env } from "./env";
export { GameServer as Game } from "./actor/game.server";
export { Remix } from "./remix.server";

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    env: Env;
  }
}

const router = createActorKitRouter(["game"]);

if (process.env.NODE_ENV === "development") {
  logDevReady(build);
}

export default class Worker extends WorkerEntrypoint<Env> {
  fetch(request: Request): Promise<Response> | Response {
    if (request.url.includes("/api/")) {
      return router(request, this.env, this.ctx);
    }

    const id = this.env.REMIX.idFromName("default");
    return this.env.REMIX.get(id).fetch(request);
  }
}
