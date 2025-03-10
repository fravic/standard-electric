import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { World } from "miniplex";
import { Entity } from "../ecs/entity";
import { GameContext } from "../actor/game.context";
import { createWorldWithEntities } from "../ecs/factories";

const WorldContext = createContext<World<Entity> | null>(null);

export interface WorldContextProviderProps {
  children: ReactNode;
}

export function WorldContextProvider({ children }: WorldContextProviderProps) {
  const entitiesById = GameContext.useSelector((state) => state.public.entitiesById);
  const privateEntitiesById = GameContext.useSelector((state) => state.private.entitiesById);
  
  const world = useMemo(() => {
    return createWorldWithEntities(entitiesById, privateEntitiesById);
  }, [entitiesById, privateEntitiesById]);
  
  return (
    <WorldContext.Provider value={world}>
      {children}
    </WorldContext.Provider>
  );
}

export function useWorld() {
  const world = useContext(WorldContext);
  if (!world) {
    throw new Error("useWorld must be used within a WorldContextProvider");
  }
  return world;
}
