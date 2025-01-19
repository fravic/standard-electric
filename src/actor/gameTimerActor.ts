import { fromCallback } from "xstate";

export const TICK_INTERVAL_MS = 5000;

export const gameTimerActor = fromCallback(({ sendBack, receive }) => {
  let interval: NodeJS.Timeout;

  function startInterval() {
    interval = setInterval(() => {
      sendBack({ type: "TICK" });
    }, TICK_INTERVAL_MS);
  }

  receive((event) => {
    if (event.type === "PAUSE") {
      clearInterval(interval);
    }
    if (event.type === "RESUME") {
      startInterval();
    }
  });

  startInterval();
  return () => clearInterval(interval);
});
