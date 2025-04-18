import { createRequestHandler, logDevReady } from "@remix-run/cloudflare";
import * as build from "@remix-run/dev/server-build";
import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";
import { AuthHooks, withAuth } from "@open-game-collective/auth-kit/worker";

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    env: Env;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
if (process.env.NODE_ENV === "development") {
  logDevReady(build);
}

const handleRemixRequest = createRequestHandler(build);

const authHooks: AuthHooks<Env> = {
  getUserIdByEmail: async ({ email, env }) => {
    return await env.KV_STORAGE.get(`email:${email}`);
  },

  storeVerificationCode: async ({ email, code, env }) => {
    await env.KV_STORAGE.put(`code:${email}`, code, {
      expirationTtl: 600,
    });
  },

  verifyVerificationCode: async ({ email, code, env }) => {
    const storedCode = await env.KV_STORAGE.get(`code:${email}`);
    return storedCode === code;
  },

  sendVerificationCode: async ({ email, code, env }) => {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: "auth@yourdomain.com" },
          subject: "Your verification code",
          content: [{ type: "text/plain", value: `Your code is: ${code}` }],
        }),
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  },

  onNewUser: async ({ userId, env }) => {
    await env.KV_STORAGE.put(
      `user:${userId}`,
      JSON.stringify({
        created: new Date().toISOString(),
      })
    );
  },

  onAuthenticate: async ({ userId, email, env }) => {
    await env.KV_STORAGE.put(`user:${userId}:lastLogin`, new Date().toISOString());
  },

  onEmailVerified: async ({ userId, email, env }) => {
    await env.KV_STORAGE.put(`user:${userId}:verified`, "true");
    await env.KV_STORAGE.put(`email:${email}`, userId);
  },
};

const handler = withAuth<Env>(
  async (request, env, { userId, sessionId, sessionToken }) => {
    try {
      // Inject the userId, sessionId, and pageSessionId into the request context
      return await handleRemixRequest(request, {
        env,
        userId,
        sessionId,
        sessionToken,
        pageSessionId: crypto.randomUUID(),
      });
    } catch (error) {
      console.error("Error processing request:", error);
      return new Response("Internal Error", { status: 500 });
    }
  },
  { hooks: authHooks }
);

export class Remix extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    console.log("Handling request", { pathname: url.pathname });
    return handler(request, this.env);
  }
}
