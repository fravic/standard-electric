# Systems Refactoring Plan

## Overview

This document outlines a plan to extract complex game logic from `game.machine.ts` into more easily testable and maintainable system classes under the ECS (Entity Component System) architecture. Currently, the PowerSystem is the only implemented system, but it doesn't conform to a uniform System interface, and entity mutations relating to PowerSystem are still done in the game machine.

## Goals

1. Create a consistent interface for all Systems.
2. Extract logic from the state machine into testable, isolated system classes.
3. Make system mutations predictable and contained within each system.
4. Improve code readability and maintainability.
5. Ensure all changes pass the existing test suite.

## System Interface

We should start by defining a standard interface that all systems will implement:

```typescript
/**
 * Base type for system-specific context
 */
export interface SystemContext {
  // Common base properties all contexts should have
  gameTime: number;
}

/**
 * Base type for system-specific results
 */
export interface SystemResult {
  // Common base properties all results should have
  success: boolean;
}

/**
 * Generic System interface to be implemented by all systems
 * TContext extends the base SystemContext with system-specific properties
 * TResult extends the base SystemResult with system-specific properties
 */
export interface System<TContext extends SystemContext, TResult extends SystemResult> {
  /**
   * Updates the system state based on the current world state
   * @param world The current Miniplex world
   * @param context System-specific context needed for the update
   * @returns System-specific result object
   */
  update(world: World<Entity>, context: TContext): TResult;
  
  /**
   * Performs mutations on entities within the system's scope
   * @param draft An Immer draft of the entities by ID
   * @param result The result from the update method
   */
  mutate(draft: Draft<Record<string, Entity>>, result: TResult): void;
}
```

## Systems to Implement

### 1. PowerSystem (Update Existing)

Current issues:
- PowerSystem doesn't follow a standard interface
- Entity mutations are still done in game.machine.ts
- PowerSystem contains both computation and mutation logic

Changes needed:
- Modify PowerSystem to implement the System interface
- Move fuel storage updates from game.machine.ts to PowerSystem.mutate()
- Ensure tests continue to pass

### 2. AuctionSystem

Current issues:
- Auction logic is scattered across multiple actions in game.machine.ts
- Auction state changes are directly mutating the game context

Implementation plan:
- Create AuctionSystem class that implements the System interface
- Extract the following functions from game.machine.ts:
  - startAuction
  - auctionInitiateBid
  - auctionPass
  - auctionPlaceBid
  - auctionPassBid
  - endBidding
- Create relevant tests for AuctionSystem

### 3. SurveySystem

Current issues:
- Survey logic is mixed with state machine code
- Survey updates happen directly in the game.machine.ts

Implementation plan:
- Create SurveySystem class that implements the System interface
- Extract the following functions from game.machine.ts:
  - surveyHexTile
  - precomputeResources
  - updateSurveys (already in lib/surveys.ts)
- Implement methods for starting and updating surveys
- Create tests for SurveySystem

### 4. CommoditySystem

Current issues:
- Commodity market logic is handled in actions within game.machine.ts
- Entity mutations for fuel storage are mixed with market logic

Implementation plan:
- Create CommoditySystem class that implements the System interface
- Extract the following functions from game.machine.ts:
  - buyCommodity
  - sellCommodity
- Integrate with existing market code in lib/market/CommodityMarket.ts
- Write tests for CommoditySystem

### 5. BuildableSystem

Current issues:
- Buildable creation logic is contained in the addBuildable action
- Validation is separated from creation logic

Implementation plan:
- Create BuildableSystem class that implements the System interface
- Extract functionality from:
  - addBuildable
  - isValidBuildableLocation
- Implement methods for validating and creating buildables
- Create tests for BuildableSystem

## Implementation Approach

1. **Create Base System Interface**
   - Define a standard interface all systems will implement
   - Add utility functions for working with systems

2. **Implement Systems One by One**
   - Begin with PowerSystem to establish the pattern
   - For each system:
     - Create the system class
     - Extract logic from game.machine.ts
     - Write tests
     - Update game.machine.ts to use the new system

3. **Update game.machine.ts to use Systems**
   - Replace inline logic with system calls
   - Initialize all systems at the start
   - Update the tick handler to use system.update() and system.mutate()

## Implementation Progress

### Completed

#### 1. System Interface
- ✅ Created the `System.ts` interface with generic type parameters for context and result
- ✅ Defined base `SystemContext` and `SystemResult` interfaces
- ✅ Added `update()` and `mutate()` methods to ensure consistency across systems

#### 2. PowerSystem
- ✅ Refactored PowerSystem to implement the new System interface
- ✅ Created PowerContext and PowerResult types
- ✅ Implemented update() method to process power production
- ✅ Implemented mutate() method to update entity states
- ✅ Modified game.machine.ts to use the new PowerSystem implementation
- ✅ Updated PowerSystem.test.ts to work with the new interface
- ✅ Updated validateBuildableLocation.ts to work with the new PowerSystem
- ✅ Made resolveOneHourOfPowerProduction() public for testing purposes (marked as internal API)

### Completed

#### 3. AuctionSystem
- ✅ Created AuctionSystem class implementing the System interface
- ✅ Extracted auction logic from game.machine.ts into individual methods
- ✅ Created comprehensive test suite in AuctionSystem.test.ts
- ✅ Fixed purchasing logic to ensure player money is only deducted once
- ✅ Consolidated all auction functionality into AuctionSystem
- ✅ Removed redundant auction.ts utility file

### Completed

#### 4. SurveySystem
- ✅ Created SurveySystem class implementing the System interface
- ✅ Extracted survey logic from surveys.ts into individual methods
- ✅ Created comprehensive test suite in SurveySystem.test.ts
- ✅ Implemented precomputation of resources with deterministic outcomes
- ✅ Added support for managing surveys for multiple players

### Next Steps

1. ✅ Integrate AuctionSystem into game.machine.ts
2. Integrate SurveySystem into game.machine.ts
3. Implement CommoditySystem and BuildableSystem

4. **Testing Strategy**
   - Write unit tests for each system in isolation
   - Use the existing e2e tests to verify integration
   - Ensure no functionality changes during refactoring

## Example Refactoring Pattern

For each system, follow this pattern:

1. Extract the system's data and logic
2. Create the system class implementation
3. Replace inline logic in game.machine with system calls

### Example for AuctionSystem:

```typescript
// Before (in game.machine.ts)
auctionInitiateBid: assign(
  ({ context, event }: { context: GameContext; event: GameEvent }) => ({
    public: produce(context.public, (draft) => {
      if (event.type === "INITIATE_BID" && draft.auction) {
        const blueprintId = event.blueprintId;
        const blueprint = draft.entitiesById[blueprintId];
        if (!blueprint) return;

        draft.auction.currentBlueprint = {
          blueprintId,
          bids: [
            {
              playerId: event.caller.id,
              amount: blueprint.cost?.amount || 0,
            },
          ],
        };
      }
    }),
  })
)

// After refactoring
// In AuctionSystem.ts

// Define specific context type for AuctionSystem
interface AuctionContext extends SystemContext {
  auction: AuctionState;
  event: GameEvent; // Keep this generic, handle specific event types in implementation
  players: Record<string, Player>;
}

// Define specific result type for AuctionSystem
interface AuctionResult extends SystemResult {
  auction?: AuctionState;
  purchase?: {
    playerId: string;
    blueprintId: string;
    price: number;
  };
}

export class AuctionSystem implements System<AuctionContext, AuctionResult> {
  initiateBid(auction: AuctionState, blueprintId: string, playerId: string, entities: Record<string, Entity>): AuctionResult {
    const blueprint = entities[blueprintId];
    if (!blueprint || !auction) return { success: false };
    
    return {
      success: true,
      auction: {
        ...auction,
        currentBlueprint: {
          blueprintId,
          bids: [
            {
              playerId,
              amount: blueprint.cost?.amount || 0,
            },
          ],
        }
      }
    };
  }
  
  // ... other auction methods
  
  update(world: World<Entity>, context: AuctionContext): AuctionResult {
    const { auction, event, gameTime } = context;
    
    // Handle specific event types by checking event.type and casting as needed
    if (event.type === "INITIATE_BID") {
      // Use type guards to safely access event properties
      const initiateBidEvent = event as GameEvent & { blueprintId: string; caller: { id: string } };
      return this.initiateBid(
        auction, 
        initiateBidEvent.blueprintId, 
        initiateBidEvent.caller.id, 
        world.entities
      );
    }
    // ... handle other event types
    return { success: false };
  }
  
  mutate(draft: Draft<Record<string, Entity>>, result: AuctionResult): void {
    // Any entity-specific mutations would go here
  }
}

// In game.machine.ts
auctionInitiateBid: assign(
  ({ context, event }: { context: GameContext; event: GameEvent }) => {
    const auctionSystem = new AuctionSystem();
    const world = createWorldWithEntities(context.public.entitiesById);
    
    // Create a properly typed context object for the auction system
    const auctionContext: AuctionContext = {
      auction: context.public.auction!,
      event,
      players: context.public.players,
      gameTime: context.public.time.totalTicks
    };
    
    const result = auctionSystem.update(world, auctionContext);
    
    if (!result.success) return context;
    
    return {
      public: produce(context.public, (draft) => {
        if (result.auction) {
          draft.auction = result.auction;
        }
        
        // Let the system handle entity mutations
        auctionSystem.mutate(draft.entitiesById, result);
        
        // Handle any additional state changes from the result
        if (result.purchase) {
          draft.players[result.purchase.playerId].money -= result.purchase.price;
        }
      })
    };
  }
)
```

## System-Specific Types

To maintain type safety across the codebase, we'll define specific context and result types for each system:

### PowerSystem Types

```typescript
interface PowerContext extends SystemContext {
  hexGrid: HexGrid;
  time: { totalTicks: number };
}

interface PowerResult extends SystemResult {
  incomePerPlayer: Record<string, number>;
  powerSoldPerPlayerKWh: Record<string, number>;
  currentFuelStorageByPowerPlantId: Record<string, number>;
  grids: Array<{
    id: string;
    powerPlantIds: string[];
    powerPoleIds: string[];
    totalCapacity: number;
    usedCapacity: number;
    blackout: boolean;
  }>;
}
```

### BuildableSystem Types

```typescript
interface BuildableContext extends SystemContext {
  event: GameEvent; // Keep this generic, handle specific event types in implementation
  players: Record<string, Player>;
  hexGrid: HexGrid;
  surveyedHexCells: Record<string, Set<string>>; // Map player ID to their surveyed hex cells
}

interface BuildableResult extends SystemResult {
  newEntity?: Entity; // The newly created entity to be added to the world
  blueprintId?: string; // Blueprint used to create the entity
  playerId?: string; // Player who created the entity
  cost?: number; // Cost of building the entity
  remainingBuilds?: number; // Remaining builds for the blueprint
  validation: {
    valid: boolean;
    reason?: string;
  };
}
```

### SurveySystem Types

```typescript
interface SurveyContext extends SystemContext {
  event: GameEvent; // Keep this generic, handle specific event types in implementation
  playerSurveys: Record<string, Record<string, SurveyResult>>;
  hexGrid: HexGrid;
  randomSeed: number;
}

interface SurveyResult extends SystemResult {
  updatedSurveys: Record<string, Record<string, SurveyResult>>;
  precomputedResources?: Record<string, ResourceData>;
}
```

### CommoditySystem Types

```typescript
interface CommodityContext extends SystemContext {
  event: GameEvent; // Keep this generic, handle specific event types in implementation
  players: Record<string, Player>;
  market: CommodityMarket;
}

interface CommodityResult extends SystemResult {
  actualCost?: number;
  actualFuelAdded?: number;
  totalProfit?: number;
  actualFuelRemoved?: number;
  updatedMarket: CommodityMarket;
}
```

## Implementation Progress

### Completed

- [x] **System Interface**: Created a standard System interface in `/app/ecs/systems/System.ts` with generic type parameters for context and result
- [x] **PowerSystem Refactoring**: Updated PowerSystem to implement the System interface
  - Implemented `update()` method that takes world and context and returns a PowerResult
  - Implemented `mutate()` method that updates entity state based on power calculation results
  - Reorganized internal methods to work with the new interface

### In Progress

- [ ] Update game.machine.ts to use the refactored PowerSystem
- [ ] Implement BuildableSystem
- [ ] Implement AuctionSystem
- [ ] Implement SurveySystem
- [ ] Implement CommoditySystem

## Timeline

1. **Week 1**: Define the System interface and refactor PowerSystem
2. **Week 2**: Implement BuildableSystem and update related functions
3. **Week 3**: Implement AuctionSystem and associated tests
4. **Week 4**: Implement SurveySystem and CommoditySystem

## Conclusion

This refactoring plan provides a clear path to extracting complex game logic from game.machine.ts into more easily testable and maintainable system classes. By following a consistent System interface pattern, we can ensure that our ECS architecture is unified and that entity mutations are properly encapsulated within their relevant systems.

The end result will be a cleaner, more maintainable codebase with better separation of concerns, making it easier to test individual components and extend the game's functionality in the future.
