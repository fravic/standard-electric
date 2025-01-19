import { toWorldPoint } from "../coordinates/HexCoordinates";
import { CoalPlant, createCoalPlant } from "../buildables/CoalPlant";

export type { CoalPlant };
export { createCoalPlant };

export function getCoalPlantWorldPoint(plant: CoalPlant): [number, number, number] {
  if (!plant.coordinates) {
    throw new Error("Coal plant missing coordinates");
  }
  const point = toWorldPoint(plant.coordinates);
  return [point[0], 0.5, point[2]];
}
