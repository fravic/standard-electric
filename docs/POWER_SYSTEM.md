### How the power system works

- Hex tiles with population > 0 are consumers
- Power plants are providers, and have a maximum capacity
- Each player has their own set of power grids
- Power grids may overlap with each other, providing power to the same set of consumers
- Players may set a price per kWh on their power plants, and consumers will choose the lowest available price
- Players must ensure that their supply always exceeds demand, to avoid blackouts

For each consumer:

1. **Assess Combined Capacity:**
   - Gather all available power plants connected to the consumer across all non-blacked-out grids.
   - Sum the remaining capacities of these plants.
   - If this sum is less than the consumer's remaining demand, blackout **all** grids connected to the consumer.
2. **Allocation (if no blackout):**
   - If combined capacity is sufficient, proceed to allocate power from the cheapest available sources across grids, updating capacities as before.

This approach ensures that a grid isn’t blacked out solely due to a single consumer’s draw from that grid if other grids can compensate. A blackout occurs only when all connected grids together can’t fulfill the consumer’s demand.

### Pseudocode

```typescript
type PowerPlant = {
  id: string;
  pricePerKwh: number;
  maxCapacity: number;
  remainingCapacity: number;
  gridId: string;
};

type Consumer = {
  id: string;
  demandKwh: number;
  remainingDemand: number;
  connectedPlantIds: string[];
};

type GridStatus = {
  totalCapacity: number; // Sum of max capacities of plants in the grid
  usedCapacity: number;
  blackout: boolean;
};

function simulateGlobal(
  powerPlants: PowerPlant[],
  consumers: Consumer[],
  gridStatusMap: { [gridId: string]: GridStatus }
): void {
  // Initialize capacities and statuses
  for (const plant of powerPlants) {
    plant.remainingCapacity = plant.maxCapacity;
  }
  for (const consumer of consumers) {
    consumer.remainingDemand = consumer.demandKwh;
  }

  // Process each consumer globally
  for (const consumer of consumers) {
    // Step 1: Assess combined capacity from all connected, non-blackout plants
    const availablePlants = consumer.connectedPlantIds
      .map((pid) => powerPlants.find((p) => p.id === pid))
      .filter(
        (plant): plant is PowerPlant =>
          plant !== undefined &&
          plant.remainingCapacity > 0 &&
          !gridStatusMap[plant.gridId].blackout
      );

    const totalAvailable = availablePlants.reduce(
      (sum, plant) => sum + plant.remainingCapacity,
      0
    );

    // If total available capacity is less than demand, blackout all connected grids.
    if (totalAvailable < consumer.remainingDemand) {
      for (const plant of availablePlants) {
        const grid = gridStatusMap[plant.gridId];
        grid.blackout = true;
      }
      // Skip allocation for this consumer since we've triggered blackouts
      continue;
    }

    // Step 2: Allocate power since combined capacity can meet demand
    while (consumer.remainingDemand > 0) {
      // Refresh available plants, since capacities may change during allocation
      const allocatablePlants = consumer.connectedPlantIds
        .map((pid) => powerPlants.find((p) => p.id === pid))
        .filter(
          (plant): plant is PowerPlant =>
            plant !== undefined &&
            plant.remainingCapacity > 0 &&
            !gridStatusMap[plant.gridId].blackout
        );

      if (allocatablePlants.length === 0) break;

      // Sort plants by price ascending
      allocatablePlants.sort((a, b) => a.pricePerKwh - b.pricePerKwh);

      // Select the cheapest plant
      const plant = allocatablePlants[0];
      const grid = gridStatusMap[plant.gridId];

      // Determine how much power to allocate from this plant
      const supply = Math.min(
        consumer.remainingDemand,
        plant.remainingCapacity
      );

      // Allocate power and update capacities/demand
      plant.remainingCapacity -= supply;
      consumer.remainingDemand -= supply;
      grid.usedCapacity += supply;
      // (Optionally, add revenue tracking here)

      // Allocation continues until consumer's demand is met or no more capacity is available
    }
  }
}
```

### Explanation

1. **Combined Capacity Check:**

   - Before attempting to allocate power, the algorithm collects all plants connected to the consumer that belong to non-blacked-out grids.
   - It sums their remaining capacities and checks if this sum can satisfy the consumer’s remaining demand.
   - If not, it flags each grid associated with these plants as blacked out, preventing further use of those grids for any consumer.

2. **Power Allocation:**

   - If the combined capacity is sufficient, the algorithm proceeds with allocation.
   - It sorts the available plants by price and allocates power in increments, updating capacities and consumer demand iteratively.

3. **Grid Blackout Decision:**
   - A grid is not blacked out immediately when a single consumer draws power from it.
   - Instead, a blackout is triggered only when the consumer’s overall demand cannot be met by the combined capacity of all grids they’re connected to.

### Considerations

- **Multiple Consumers:**  
  The algorithm processes consumers sequentially. The order of consumer processing can affect which grids blackout, so consider how you want to handle fairness or prioritization in your simulation.
- **Revenue and Additional Logic:**  
  Revenue tracking and further actions post-allocation can be integrated where indicated. Also, once a grid is blacked out, you might want to remove all its plants from future consideration for remaining consumers.
