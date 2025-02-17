import {
  coordinatesToString,
  equals,
  HexCoordinates,
} from "../coordinates/HexCoordinates";
import { HexCell, Population } from "../HexCell";
import { Buildable } from "../buildables/schemas";
import { isPowerPole, PowerPole } from "../buildables/PowerPole";
import { isPowerPlant } from "../buildables/PowerPlant";
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
  powerSoldPerPlayerKWh: Record<string, number>;
  grids: Grid[];
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

type Grid = {
  id: string;
  powerPlantIds: string[];
  powerPoleIds: string[];
  totalCapacity: number;
  usedCapacity: number;
  blackout: boolean;
};

type Consumer = {
  coordinates: HexCoordinates;
  demandKwh: number;
  remainingDemand: number;
  connectedPlants: PowerPlantConnection[];
};

export class PowerSystem {
  private hexGrid: HexGrid;
  private buildables: Buildable[];
  private powerPolesById: Record<string, PowerPole> = {};
  private powerPlants: PowerPlant[] = [];
  private consumers: Consumer[] = [];
  private grids: Grid[] = [];

  constructor(hexGrid: HexGrid, buildables: Buildable[]) {
    this.hexGrid = hexGrid;
    this.buildables = buildables;
    this.initializePowerSystem();
  }

  private initializePowerSystem() {
    // Initialize power plants from coal plants
    this.powerPlants = this.buildables.filter(isPowerPlant).map((plant) => ({
      id: plant.id,
      playerId: plant.playerId,
      pricePerKwh: plant.pricePerKwh,
      maxCapacity: plant.powerGenerationKW,
      remainingCapacity: plant.powerGenerationKW,
      gridId: plant.id, // Each plant starts in its own grid
      coordinates: plant.coordinates,
    }));

    // Initialize power poles
    this.powerPolesById = this.buildables
      .filter(isPowerPole)
      .reduce((acc, pole) => {
        acc[pole.id] = pole;
        return acc;
      }, {} as Record<string, PowerPole>);

    // Compile grids from connected power plants and poles
    this.grids = this.compileGrids();

    // Find all populated cells that need power
    const cells = Object.values(this.hexGrid.cellsByHexCoordinates);
    this.consumers = cells
      .filter((cell) => cell.population > Population.Unpopulated)
      .map((cell) => ({
        coordinates: cell.coordinates,
        demandKwh: POWER_CONSUMPTION_RATES_KW[cell.population],
        remainingDemand: POWER_CONSUMPTION_RATES_KW[cell.population],
        connectedPlants: this.findConnectedPowerPlants(cell.coordinates)
          .connectedPlants,
      }));
  }

  // Find power plants connected to this hex
  private findConnectedPowerPlants(coordinates: HexCoordinates): {
    connectedPlants: PowerPlantConnection[];
    connectedPoleIds: string[];
  } {
    const connectedPlants: PowerPlantConnection[] = [];
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

    return {
      connectedPlants,
      connectedPoleIds: Array.from(visitedPowerPoleIds),
    };
  }

  private compileGrids(): Grid[] {
    const grids: Grid[] = [];
    const processedPlantIds = new Set<string>();

    // For each unprocessed power plant, find all connected power plants and poles
    for (const plant of this.powerPlants) {
      if (processedPlantIds.has(plant.id)) continue;

      // Start a new grid
      const grid: Grid = {
        id: plant.id, // Use first plant's ID as grid ID
        powerPlantIds: [plant.id],
        powerPoleIds: [],
        totalCapacity: plant.maxCapacity,
        usedCapacity: 0,
        blackout: false,
      };
      processedPlantIds.add(plant.id);

      // Find all power plants and poles connected to this one
      const { connectedPlants, connectedPoleIds } =
        this.findConnectedPowerPlants(plant.coordinates);

      // Add connected plants to the grid
      for (const { plantId } of connectedPlants) {
        if (!processedPlantIds.has(plantId)) {
          const connectedPlant = this.powerPlants.find(
            (p) => p.id === plantId
          )!;
          grid.powerPlantIds.push(plantId);
          grid.totalCapacity += connectedPlant.maxCapacity;
          processedPlantIds.add(plantId);
        }
      }

      // Add all connected poles to the grid
      grid.powerPoleIds = connectedPoleIds;

      grids.push(grid);
    }

    return grids;
  }

  resolveOneHourOfPowerProduction(): PowerSystemResult {
    // Reset capacities and statuses
    this.powerPlants.forEach((plant) => {
      plant.remainingCapacity = plant.maxCapacity;
    });
    this.consumers.forEach((consumer) => {
      consumer.remainingDemand = consumer.demandKwh;
    });
    this.grids.forEach((grid) => {
      grid.usedCapacity = 0;
      grid.blackout = false;
    });

    // Track power sold per player
    const powerSoldPerPlayer: Record<string, number> = {};
    const incomePerPlayer: Record<string, number> = {};

    // First pass: Check for blackouts
    // Calculate total demand per grid and available capacity per consumer
    const demandPerGrid = new Map<Grid, number>();
    const consumersByGrid = new Map<Grid, Consumer[]>();
    const totalAvailablePerConsumer = new Map<Consumer, number>();

    // First, calculate total available capacity for each consumer
    for (const consumer of this.consumers) {
      const connectedGrids = new Set(
        consumer.connectedPlants
          .map((connection) =>
            this.powerPlants.find((p) => p.id === connection.plantId)
          )
          .filter((plant): plant is PowerPlant => plant !== undefined)
          .map(
            (plant) =>
              this.grids.find((g) => g.powerPlantIds.includes(plant.id))!
          )
      );

      // Calculate total available capacity across all connected grids
      const totalAvailable = Array.from(connectedGrids).reduce(
        (sum, grid) => sum + grid.totalCapacity,
        0
      );
      totalAvailablePerConsumer.set(consumer, totalAvailable);

      // Add this consumer's demand to each connected grid
      for (const grid of connectedGrids) {
        const currentDemand = demandPerGrid.get(grid) || 0;
        demandPerGrid.set(grid, currentDemand + consumer.demandKwh);

        const consumers = consumersByGrid.get(grid) || [];
        consumers.push(consumer);
        consumersByGrid.set(grid, consumers);
      }
    }

    // Check each grid for blackout
    for (const grid of this.grids) {
      const consumers = consumersByGrid.get(grid) || [];
      // A grid goes into blackout if any of its consumers can't meet their demand
      // from their total available capacity across all connected grids
      const causesBlackout = consumers.some(
        (consumer) =>
          (totalAvailablePerConsumer.get(consumer) || 0) < consumer.demandKwh
      );
      if (causesBlackout) {
        grid.blackout = true;
        // When a grid is in blackout, all connected grids for its consumers
        // should also be in blackout
        for (const consumer of consumers) {
          const connectedGrids = new Set(
            consumer.connectedPlants
              .map((connection) =>
                this.powerPlants.find((p) => p.id === connection.plantId)
              )
              .filter((plant): plant is PowerPlant => plant !== undefined)
              .map(
                (plant) =>
                  this.grids.find((g) => g.powerPlantIds.includes(plant.id))!
              )
          );
          for (const connectedGrid of connectedGrids) {
            connectedGrid.blackout = true;
          }
        }
      }
    }

    // Second pass: Process consumption for non-blacked-out grids
    for (const consumer of this.consumers) {
      // Get available plants from non-blacked-out grids
      const availablePlants = consumer.connectedPlants
        .map((connection) => ({
          plant: this.powerPlants.find((p) => p.id === connection.plantId),
          path: connection.path,
        }))
        .filter(
          (connection): connection is { plant: PowerPlant; path: string[] } =>
            connection.plant !== undefined
        )
        .filter(({ plant }) => {
          if (plant.remainingCapacity <= 0) return false;
          const grid = this.grids.find((g) =>
            g.powerPlantIds.includes(plant.id)
          );
          return !grid?.blackout;
        })
        .map(({ plant }) => plant);

      // Sort plants by price ascending
      availablePlants.sort((a, b) => a.pricePerKwh - b.pricePerKwh);

      // Allocate power from each available plant until demand is met
      let remainingDemand = consumer.demandKwh;
      for (const plant of availablePlants) {
        if (remainingDemand <= 0) break;

        const grid = this.grids.find((g) =>
          g.powerPlantIds.includes(plant.id)
        )!;
        if (grid.blackout) continue;

        // Determine how much power to allocate from this plant
        const supply = Math.min(remainingDemand, plant.remainingCapacity);

        // Allocate power and update capacities/demand
        plant.remainingCapacity -= supply;
        remainingDemand -= supply;
        grid.usedCapacity += supply;

        // Track power sold and income
        powerSoldPerPlayer[plant.playerId] =
          (powerSoldPerPlayer[plant.playerId] || 0) + supply;
        incomePerPlayer[plant.playerId] =
          (incomePerPlayer[plant.playerId] || 0) + supply * plant.pricePerKwh;
      }
    }

    return {
      incomePerPlayer,
      powerSoldPerPlayerKWh: powerSoldPerPlayer,
      grids: this.grids,
    };
  }
}
