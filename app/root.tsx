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

import { useState } from "react";
import { IonWrapper } from "./components/IonWrapper";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Our custom styles - must be imported AFTER Ionic to override their styles */
import styles from "./styles.css";

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
  // Web App Manifest
  { rel: "manifest", href: "/manifest.json" },
  // iOS homescreen icons
  { rel: "apple-touch-icon", href: "/assets/icons/apple-touch-icon.png" },
  { rel: "icon", type: "image/png", sizes: "192x192", href: "/assets/icons/icon-192x192.png" },
  { rel: "icon", type: "image/png", sizes: "512x512", href: "/assets/icons/icon-512x512.png" },
  // iOS splash screens - landscape orientation
  {
    rel: "apple-touch-startup-image",
    href: "/assets/splashscreens/apple-splash-2436-1125.png",
    media:
      "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)",
  }, // iPhone X/XS/11 Pro
  {
    rel: "apple-touch-startup-image",
    href: "/assets/splashscreens/apple-splash-2048-1536.png",
    media:
      "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)",
  }, // iPad
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  return json({
    host: context.env.ACTOR_KIT_HOST,
    sessionId: context.sessionId,
    sessionToken: context.sessionToken,
    userId: context.userId,
  });
}

export default function App() {
  const isDevelopment = true;

  const { sessionId, sessionToken, userId, host } = useLoaderData<typeof loader>();

  const [authClient] = useState(
    createAuthClient({
      host,
      userId: userId,
      sessionToken: sessionToken,
    })
  );

  return (
    <AuthContext.Provider client={authClient}>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          />
          <meta name="theme-color" content="#000000" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Standard Electric" />
          <Meta />
          <Links />
        </head>
        <body>
          <IonWrapper>
            <Outlet />
          </IonWrapper>
          <ScrollRestoration />
          <Scripts />
          {isDevelopment && <LiveReload />}
        </body>
      </html>
    </AuthContext.Provider>
  );
}
