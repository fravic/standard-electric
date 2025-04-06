import {
  json,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { createAuthClient } from "@open-game-collective/auth-kit/client";

import { AuthContext } from "./auth.context";

import styles from "./styles.css";
import { useState } from "react";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Chivo+Mono:ital,wght@0,100..900;1,100..900&family=Wittgenstein:ital,wght@0,400..900;1,400..900&display=swap",
  },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  return json({
    sessionId: context.sessionId,
    sessionToken: context.sessionToken,
    userId: context.userId,
  });
}

export default function App() {
  const isDevelopment = true;

  const { sessionId, sessionToken, userId } = useLoaderData<typeof loader>();

  const [authClient] = useState(
    createAuthClient({
      host: "localhost:8787",
      userId: userId,
      sessionToken: sessionToken,
    })
  );

  return (
    <AuthContext.Provider client={authClient}>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body>
          <Outlet />
          <ScrollRestoration />
          <Scripts />
          {isDevelopment && <LiveReload />}
        </body>
      </html>
    </AuthContext.Provider>
  );
}
