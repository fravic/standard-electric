import { Buildable } from "./schemas";

export const BUILDABLE_COSTS: Record<Buildable["type"], number> = {
  power_pole: 1,
  coal_plant: 0,
};
