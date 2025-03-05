import { Draft, current } from "immer";

import { Entity } from "./entity";
import { Component, ComponentType } from "./components";

/**
 * EntityReadRegistry
 * A read-only registry of entities and their components. Used on the client,
 * which can't modify the registry directly.
 */
export class EntityReadRegistry {
  protected entities: Record<string, Entity> = {};
  protected componentsByType: Record<string, Component[]> = {};

  constructor(entities: Record<string, Entity>) {
    this.setEntities(entities);
  }

  setEntities(entities: Record<string, Entity>) {
    this.entities = entities;
    this.componentsByType = Object.values(entities).reduce((acc, entity) => {
      Object.values(entity.componentsByType).forEach((component) => {
        acc[component.type] = [...(acc[component.type] || []), component];
      });
      return acc;
    }, {} as Record<string, Component[]>);
  }

  /**
   * Get an entity by ID
   */
  getEntity(entityId: string): Entity | undefined {
    return this.entities[entityId];
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Object.values(this.entities);
  }

  /**
   * Get a component from an entity
   */
  getComponent<T extends Component>(
    entityId: string,
    componentType: ComponentType
  ): T | undefined {
    const component = this.entities[entityId]?.componentsByType[
      componentType
    ] as unknown;
    return component as T | undefined;
  }

  /**
   * Returns the only component of a given type. If there is more than one,
   * throws an error.
   */
  getOnlyComponent<T extends Component>(componentType: ComponentType): T {
    const component = this.componentsByType[componentType];
    if (!component) {
      throw new Error(`Component ${componentType} not found`);
    }
    if (component.length > 1) {
      throw new Error(`More than one component of type ${componentType}`);
    }
    return component[0] as T;
  }

  /**
   * Get all entities that have a particular component type
   */
  getEntitiesWithComponent(componentType: ComponentType): Entity[] {
    return Object.values(this.entities).filter(
      (entity) => entity.componentsByType[componentType]
    );
  }

  /**
   * Get all components of a particular type
   */
  getAllComponentsOfType<T extends Component>(
    componentType: ComponentType
  ): T[] {
    return Object.values(this.entities).flatMap(
      (entity) => entity.componentsByType[componentType]
    ) as T[];
  }
}

/**
 * EntityWriteRegistry
 * A registry of entities and their components. Used on the server, which can modify the registry directly.
 */
export class EntityWriteRegistry extends EntityReadRegistry {
  protected draftEntities: Draft<Record<string, Entity>> = {};

  constructor(draftEntities: Draft<Record<string, Entity>>) {
    super(current(draftEntities));
    this.draftEntities = draftEntities;
  }

  /**
   * Add an entity to the registry
   */
  addEntity(entity: Entity): void {
    this.draftEntities[entity.id] = entity;
    this.setEntities(current(this.draftEntities));
  }

  /**
   * Remove an entity and all its components
   */
  removeEntity(entityId: string): void {
    delete this.draftEntities[entityId];
    this.setEntities(current(this.draftEntities));
  }

  /**
   * Add a component to an entity
   */
  addComponent<T extends Component>(entityId: string, component: T): void {
    const draftEntity = this.draftEntities[entityId];
    if (!draftEntity) {
      throw new Error(`Entity ${entityId} does not exist`);
    }
    if (!draftEntity.componentsByType[component.type]) {
      throw new Error(
        `Component ${component.type} already exists on entity ${entityId}`
      );
    }
    draftEntity.componentsByType[component.type] = component;
    this.setEntities(current(this.draftEntities));
  }

  /**
   * Remove a component from an entity
   */
  removeComponent(entityId: string, componentType: ComponentType): void {
    delete this.draftEntities[entityId]?.componentsByType[componentType];
    this.setEntities(current(this.draftEntities));
  }
}
