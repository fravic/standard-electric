### How the power system works

- Hex tiles with population > 0 are consumers
- Power plants are providers, and have a maximum capacity
- Each player has their own set of power grids
- Power grids may overlap with each other, providing power to the same set of consumers
- Players may set a price per kWh on their power plants, and consumers will choose the lowest available price
- Players must ensure that their supply always exceeds demand, to avoid blackouts

The power system operates in two main phases:

1. **Blackout Check Phase:**

   - For each consumer, calculate the total available capacity across all connected grids
   - If a consumer's demand cannot be met by their total available capacity, all grids connected to that consumer go into blackout
   - When a grid goes into blackout, all other grids connected to the same consumers also go into blackout
   - This ensures that if any consumer's demand cannot be met, all affected grids are properly blacked out

2. **Power Allocation Phase (for non-blacked-out grids):**
   - For each consumer:
     - Get all available plants from non-blacked-out grids
     - Sort plants by price per kWh (ascending)
     - Allocate power from each plant in order until demand is met
     - Track used capacity and calculate revenue for each player

### Key Features

1. **Grid Compilation:**

   - Power plants and poles are organized into grids
   - Connected power plants form a single grid
   - Grid capacity is the sum of all power plant capacities in the grid

2. **Power Plant Connections:**

   - Power plants connect to consumers through networks of power poles
   - Each power pole can connect to multiple other poles
   - The system finds the shortest path from consumers to power plants

3. **Multiple Grid Support:**

   - Consumers can connect to multiple grids
   - When allocating power, cheaper sources are used first
   - Total available capacity is considered across all connected grids
   - If any grid goes into blackout, connected grids are also affected

4. **Blackout Handling:**
   - A grid goes into blackout if any connected consumer's total available capacity is insufficient
   - Blackouts propagate to all grids connected to affected consumers
   - No power is allocated and no revenue is generated during blackouts

### Example Scenarios

1. **Single Grid, Multiple Consumers:**

   ```
   Consumer A (10kW) ----[Grid 1: 50kW]---- Consumer B (100kW)
   ```

   Result: Grid 1 goes into blackout because total demand (110kW) exceeds capacity (50kW)

2. **Multiple Grids, Single Consumer:**

   ```
   [Grid 1: 30kW, $0.1/kWh]
            \
   Consumer (50kW)
            /
   [Grid 2: 30kW, $0.2/kWh]
   ```

   Result: Consumer uses 30kW from Grid 1 (cheaper) and 20kW from Grid 2 (more expensive)

3. **Independent Grids:**
   ```
   Consumer A (10kW) ----[Grid 1: 20kW]
   Consumer B (100kW)----[Grid 2: 50kW]
   ```
   Result: Grid 1 operates normally, Grid 2 goes into blackout

### Implementation Details

```typescript
type PowerPlant = {
  id: string;
  playerId: string;
  pricePerKwh: number;
  maxCapacity: number;
  remainingCapacity: number;
  gridId: string;
  coordinates: HexCoordinates;
};

type Consumer = {
  coordinates: HexCoordinates;
  demandKwh: number;
  remainingDemand: number;
  connectedPlants: PowerPlantConnection[];
};

type Grid = {
  id: string;
  powerPlantIds: string[];
  powerPoleIds: string[];
  totalCapacity: number;
  usedCapacity: number;
  blackout: boolean;
};
```

The power system maintains these key data structures and updates them during each hour of simulation. The blackout check ensures system stability, while the power allocation phase optimizes for cost efficiency when distributing power to consumers.
