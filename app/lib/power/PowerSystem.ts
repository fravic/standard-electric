import { HexCoordinates } from "../coordinates/HexCoordinates";
import { HexCell, Population } from "../HexCell";
import { Buildable } from "../buildables/schemas";
import { PowerPole } from "../buildables/PowerPole";
import { CoalPlant } from "../buildables/CoalPlant";
import { HexGrid } from "../HexGrid";
import { getAdjacentHexes } from "../coordinates/CornerCoordinates";

// Power consumption rates (kW) for different population levels
export const POWER_CONSUMPTION_RATES_KW: Record<Population, number> = {
  [Population.Unpopulated]: 0,
  [Population.Village]: 10,
  [Population.Town]: 25,
  [Population.City]: 50,
  [Population.Metropolis]: 100,
  [Population.Megalopolis]: 200,
};

type PowerSystemResult = {
  incomePerPlayer: Record<string, number>;
};

export class PowerSystem {
  private hexGrid: HexGrid;
  private buildables: Buildable[];

  constructor(hexGrid: HexGrid, buildables: Buildable[]) {
    this.hexGrid = hexGrid;
    this.buildables = buildables;
  }

  resolveOneHourOfPowerProduction(): PowerSystemResult {
    const incomePerPlayer: Record<string, number> = {};
    return {
      incomePerPlayer,
    };
  }
}
