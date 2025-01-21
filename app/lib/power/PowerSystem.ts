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

type PowerPlant = {
  id: string;
  playerId: string;
  pricePerKwh: number;
  maxCapacity: number;
  remainingCapacity: number;
  gridId: string;
};

type Consumer = {
  coordinates: HexCoordinates;
  demandKwh: number;
  remainingDemand: number;
  connectedPlantIds: string[];
};

type GridStatus = {
  totalCapacity: number;
  usedCapacity: number;
  blackout: boolean;
};

export class PowerSystem {
  private hexGrid: HexGrid;
  private buildables: Buildable[];
  private powerPlants: PowerPlant[] = [];
  private consumers: Consumer[] = [];
  private gridStatusMap: Record<string, GridStatus> = {};

  constructor(hexGrid: HexGrid, buildables: Buildable[]) {
    this.hexGrid = hexGrid;
    this.buildables = buildables;
    this.initializePowerSystem();
  }

  private initializePowerSystem() {
    // Initialize power plants from coal plants
    this.powerPlants = this.buildables
      .filter(
        (
          b
        ): b is Buildable & { type: "coal_plant"; powerGenerationKW: number } =>
          b.type === "coal_plant" && typeof b.powerGenerationKW === "number"
      )
      .map((plant) => ({
        id: plant.id,
        playerId: plant.playerId,
        pricePerKwh: 0.1, // Default price per kWh
        maxCapacity: plant.powerGenerationKW,
        remainingCapacity: plant.powerGenerationKW,
        gridId: plant.id, // Each plant starts in its own grid
      }));

    // Create grid status entries for each plant
    this.powerPlants.forEach((plant) => {
      this.gridStatusMap[plant.gridId] = {
        totalCapacity: plant.maxCapacity,
        usedCapacity: 0,
        blackout: false,
      };
    });

    // Find all populated cells that need power
    const cells = Object.values(this.hexGrid.cellsByHexCoordinates);
    this.consumers = cells
      .filter((cell) => cell.population > Population.Unpopulated)
      .map((cell) => ({
        coordinates: cell.coordinates,
        demandKwh: POWER_CONSUMPTION_RATES_KW[cell.population],
        remainingDemand: POWER_CONSUMPTION_RATES_KW[cell.population],
        connectedPlantIds: this.findConnectedPowerPlants(cell.coordinates),
      }));
  }

  private findConnectedPowerPlants(coordinates: HexCoordinates): string[] {
    // Find power poles connected to this hex
    const connectedPlantIds = new Set<string>();
    const visited = new Set<string>();
    const toVisit = [coordinates];

    while (toVisit.length > 0) {
      const current = toVisit.pop()!;
      const key = `${current.x},${current.z}`;

      if (visited.has(key)) continue;
      visited.add(key);

      // Check for power plants at this location
      const plantsHere = this.powerPlants.filter((plant) =>
        this.buildables.find(
          (b) =>
            b.id === plant.id &&
            b.coordinates &&
            b.coordinates.x === current.x &&
            b.coordinates.z === current.z
        )
      );
      plantsHere.forEach((plant) => connectedPlantIds.add(plant.id));

      // Find connected power poles
      const poles = this.buildables.filter(
        (b): b is PowerPole =>
          b.type === "power_pole" &&
          b.cornerCoordinates !== undefined &&
          b.cornerCoordinates.hex.x === current.x &&
          b.cornerCoordinates.hex.z === current.z &&
          (b.isGhost === undefined || b.isGhost === false)
      );

      // Add adjacent hexes through power poles to visit
      poles.forEach((pole) => {
        const connectedPoles = this.buildables.filter(
          (b): b is PowerPole =>
            b.type === "power_pole" && pole.connectedToIds.includes(b.id)
        );

        connectedPoles.forEach((connectedPole) => {
          if (connectedPole.cornerCoordinates) {
            toVisit.push(connectedPole.cornerCoordinates.hex);
          }
        });
      });
    }

    return Array.from(connectedPlantIds);
  }

  resolveOneHourOfPowerProduction(): PowerSystemResult {
    // Reset capacities and statuses
    this.powerPlants.forEach((plant) => {
      plant.remainingCapacity = plant.maxCapacity;
    });
    this.consumers.forEach((consumer) => {
      consumer.remainingDemand = consumer.demandKwh;
    });
    Object.values(this.gridStatusMap).forEach((grid) => {
      grid.usedCapacity = 0;
      grid.blackout = false;
    });

    // Track income per player
    const incomePerPlayer: Record<string, number> = {};

    // Process each consumer
    for (const consumer of this.consumers) {
      // Step 1: Assess combined capacity from all connected, non-blackout plants
      const availablePlants = consumer.connectedPlantIds
        .map((pid) => this.powerPlants.find((p) => p.id === pid))
        .filter(
          (plant): plant is PowerPlant =>
            plant !== undefined &&
            plant.remainingCapacity > 0 &&
            !this.gridStatusMap[plant.gridId].blackout
        );

      const totalAvailable = availablePlants.reduce(
        (sum, plant) => sum + plant.remainingCapacity,
        0
      );

      // If total available capacity is less than demand, blackout all connected grids
      if (totalAvailable < consumer.remainingDemand) {
        availablePlants.forEach((plant) => {
          this.gridStatusMap[plant.gridId].blackout = true;
        });
        continue;
      }

      // Step 2: Allocate power since combined capacity can meet demand
      while (consumer.remainingDemand > 0) {
        const allocatablePlants = consumer.connectedPlantIds
          .map((pid) => this.powerPlants.find((p) => p.id === pid))
          .filter(
            (plant): plant is PowerPlant =>
              plant !== undefined &&
              plant.remainingCapacity > 0 &&
              !this.gridStatusMap[plant.gridId].blackout
          );

        if (allocatablePlants.length === 0) break;

        // Sort plants by price ascending
        allocatablePlants.sort((a, b) => a.pricePerKwh - b.pricePerKwh);

        // Select the cheapest plant
        const plant = allocatablePlants[0];
        const grid = this.gridStatusMap[plant.gridId];

        // Determine how much power to allocate from this plant
        const supply = Math.min(
          consumer.remainingDemand,
          plant.remainingCapacity
        );

        // Allocate power and update capacities/demand
        plant.remainingCapacity -= supply;
        consumer.remainingDemand -= supply;
        grid.usedCapacity += supply;

        // Calculate and add revenue
        const revenue = supply * plant.pricePerKwh;
        incomePerPlayer[plant.playerId] =
          (incomePerPlayer[plant.playerId] || 0) + revenue;
      }
    }

    return { incomePerPlayer };
  }
}
