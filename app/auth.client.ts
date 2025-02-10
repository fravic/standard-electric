import { createAuthClient } from "@open-game-collective/auth-kit/client";

export const authClient = createAuthClient({
  host: "localhost:8787",
});
