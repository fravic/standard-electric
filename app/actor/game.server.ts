import { createMachineServer } from "actor-kit/worker";
import { gameMachine } from "./game.machine";
import { GameServiceEventSchema, GameInputSchema, GameClientEventSchema } from "./game.schemas";

export const GameServer = createMachineServer({
  machine: gameMachine,
  schemas: {
    clientEvent: GameClientEventSchema,
    serviceEvent: GameServiceEventSchema,
    inputProps: GameInputSchema,
  },
  options: {
    persisted: true,
  },
});

export type GameServer = InstanceType<typeof GameServer>;
export default GameServer;
