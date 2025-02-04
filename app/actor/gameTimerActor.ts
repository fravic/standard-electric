import { fromCallback } from "xstate";
import { MILLISECONDS_PER_IN_GAME_HOUR } from "@/lib/constants";
export const gameTimerActor = fromCallback(({ sendBack, receive }) => {
  const interval = setInterval(() => {
    sendBack({ type: "TICK" });
  }, MILLISECONDS_PER_IN_GAME_HOUR);

  return () => clearInterval(interval);
});
