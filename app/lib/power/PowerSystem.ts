import {
  coordinatesToString,
  equals,
  HexCoordinates,
} from "../coordinates/HexCoordinates";
import { HexCell, Population } from "../HexCell";
import { Buildable } from "../buildables/schemas";
import { isPowerPole, PowerPole } from "../buildables/PowerPole";
import { CoalPlant } from "../buildables/CoalPlant";
import { HexGrid } from "../HexGrid";
import {
  cornerToString,
  getAdjacentHexes,
} from "../coordinates/CornerCoordinates";

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
  coordinates: HexCoordinates;
};

type PowerPlantConnection = {
  plantId: string;
  path: string[]; // Array of power pole IDs forming the path from consumer to plant
};

type Consumer = {
  coordinates: HexCoordinates;
  demandKwh: number;
  remainingDemand: number;
  connectedPlants: PowerPlantConnection[];
};

type GridStatus = {
  totalCapacity: number;
  usedCapacity: number;
  blackout: boolean;
};

export class PowerSystem {
  private hexGrid: HexGrid;
  private buildables: Buildable[];
  private powerPolesById: Record<string, PowerPole> = {};
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
        ): b is Buildable & {
          powerGenerationKW: number;
          coordinates: HexCoordinates;
        } => b.powerGenerationKW !== undefined && b.coordinates !== undefined
      )
      .map((plant) => ({
        id: plant.id,
        playerId: plant.playerId,
        pricePerKwh: 0.1, // Default price per kWh
        maxCapacity: plant.powerGenerationKW,
        remainingCapacity: plant.powerGenerationKW,
        gridId: plant.id, // Each plant starts in its own grid
        coordinates: plant.coordinates,
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
        connectedPlants: this.findConnectedPowerPlants(cell.coordinates),
      }));

    this.powerPolesById = this.buildables
      .filter(isPowerPole)
      .reduce((acc, pole) => {
        acc[pole.id] = pole;
        return acc;
      }, {} as Record<string, PowerPole>);
  }

  // Find power plants connected to this hex
  private findConnectedPowerPlants(
    coordinates: HexCoordinates
  ): { plantId: string; path: string[] }[] {
    const connectedPlants: { plantId: string; path: string[] }[] = [];
    const visitedPowerPoleIds = new Set<string>();

    // Start with the power poles at the starting hex
    const startingPoles = this.buildables.filter(isPowerPole).filter((pole) => {
      const adjacentHexes = getAdjacentHexes(pole.cornerCoordinates);
      return adjacentHexes.some((hex) => equals(hex, coordinates));
    });

    // Queue of power poles to visit, along with the path taken to reach them
    const toVisit: { powerPoleId: string; path: string[] }[] =
      startingPoles.map((pole) => ({ powerPoleId: pole.id, path: [] }));

    // Perform a BFS along connected power poles to find the shortest paths to
    // all connected power plants
    while (toVisit.length > 0) {
      const currentVisit = toVisit.shift()!;

      if (visitedPowerPoleIds.has(currentVisit.powerPoleId)) continue;
      visitedPowerPoleIds.add(currentVisit.powerPoleId);

      const currentPole = this.powerPolesById[currentVisit.powerPoleId];
      const adjacentHexes = getAdjacentHexes(currentPole.cornerCoordinates);
      const newPath = [...currentVisit.path, currentVisit.powerPoleId];

      // Check for power plants at adjacent hexes
      const plantsHere = this.powerPlants.filter((plant) =>
        adjacentHexes.some((hex) => equals(hex, plant.coordinates))
      );
      plantsHere.forEach((plant) => {
        // Only add a plant if we haven't found it yet (keeping shortest path)
        if (!connectedPlants.some((c) => c.plantId === plant.id)) {
          connectedPlants.push({ plantId: plant.id, path: newPath });
        }
      });

      // Add connected poles to the queue
      const connectedPoles = currentPole.connectedToIds;
      // TODO: Currently, we don't create bi-directional connections, but the
      // connections should be bi-directional. So we need to find all power
      // poles that point at this one too.
      const allConnectedPoles = connectedPoles.concat(
        Object.values(this.powerPolesById)
          .filter((pole) => pole.connectedToIds.includes(currentPole.id))
          .map((pole) => pole.id)
      );
      allConnectedPoles.forEach((poleId) => {
        if (visitedPowerPoleIds.has(poleId)) return;
        toVisit.push({
          powerPoleId: poleId,
          path: newPath,
        });
      });
    }

    return connectedPlants;
  }

  // TODO: Review/test this function
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
      const availablePlants = consumer.connectedPlants
        .map((connection) =>
          this.powerPlants.find((p) => p.id === connection.plantId)
        )
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
        const allocatablePlants = consumer.connectedPlants
          .map((connection) =>
            this.powerPlants.find((p) => p.id === connection.plantId)
          )
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
