# Standard Electric

An online multiplayer competitive strategy game focused on power grid management and electrical infrastructure.

## Game Overview

Standard Electric is a strategic bidding game where players manage and expand an electrical power company. The core gameplay revolves around:

- Bidding on power plant rights
- Building and connecting power infrastructure
- Managing power generation and distribution
- Balancing supply and demand across the grid
- Upgrading and optimizing the power network

### Core Mechanics

1. **Power Grid Management**

   - Build power plants (coal, solar, etc.)
   - Connect buildings with power lines
   - Monitor power flow and capacity
   - Handle blackouts and grid failures

2. **Building System**

   - Hex-based grid system
   - Various building types (power plants, poles, substations)
   - Power line connections between buildings
   - Resource management for power generation

3. **Economic System**
   - Resource costs for construction
   - Maintenance costs
   - Fuel costs
   - Power delivery revenue
   - Research and upgrades

## Technical Architecture

### Key Components

- **UI components**: `src/components`
- **Game State Machine (xState, actor-kit)**: `src/actor`
- **Buildables (power plants, power poles, etc):**: `src/lib/buildables/`
- **Grid System**: `src/lib/HexGrid`
- **Power System**: `src/lib/power/`

### Tech Stack

- TypeScript
- React
- XState (for state management)
- Three.js (for 3D rendering)

## Development

Run the development server (Remix + Cloudflare):

```sh
bun run dev
```

### Setup

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables:

```bash
cp .dev.vars.example .dev.vars
```

## Tests

```sh
bun test
```

## Deployment

Deploy your app to Cloudflare Pages:

```sh
bun run deploy
```

## Project Structure

```
src/
├── actor/          # Game state and server logic
├── components/     # React components
├── lib/           # Core game systems
│   ├── buildables/  # Building types and logic
│   └── coordinates/ # Grid coordinate system
```

## Contributing

When working on this codebase, keep in mind:

1. The game uses a hex-based grid system for all building placement
2. Power systems are core to gameplay - changes should maintain power mechanics integrity
3. The state machine in `game.machine.ts` controls core game flow
4. Building types are defined in `lib/buildables/` and must implement the `Buildable` interface

## Game Design Document

For detailed game design information, refer to the [full design document](https://fravic.notion.site/Standard-Electric-Game-Design-Document-16ef2e605a16806b9983fcb0c894d725).
