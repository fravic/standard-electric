import { fromCallback } from "xstate";

export const TICK_INTERVAL_MS = 5000;

export const gameTimerActor = fromCallback(({ sendBack, receive }) => {
  const interval = setInterval(() => {
    sendBack({ type: "TICK" });
  }, TICK_INTERVAL_MS);

  return () => clearInterval(interval);
});
