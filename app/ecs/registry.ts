import { Entity } from "./entity";
import { Component } from "./components";

/**
 * EntityRegistry
 *
 * Central storage for all entities and their components.
 * Provides methods to add, remove, and query entities and components.
 */
export class EntityRegistry {
  private entities: Map<string, Entity> = new Map();
  private components: Map<string, Map<string, Component>> = new Map();

  /**
   * Add an entity to the registry
   */
  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
    // Initialize component storage for this entity
    this.components.set(entity.id, new Map());
  }

  /**
   * Remove an entity and all its components
   */
  removeEntity(entityId: string): void {
    this.entities.delete(entityId);
    this.components.delete(entityId);
  }

  /**
   * Get an entity by ID
   */
  getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Add a component to an entity
   */
  addComponent<T extends Component>(
    entityId: string,
    componentType: string,
    component: T
  ): void {
    const entityComponents = this.components.get(entityId);
    if (!entityComponents) {
      throw new Error(`Entity ${entityId} does not exist`);
    }
    entityComponents.set(componentType, component);
  }

  /**
   * Remove a component from an entity
   */
  removeComponent(entityId: string, componentType: string): void {
    const entityComponents = this.components.get(entityId);
    if (entityComponents) {
      entityComponents.delete(componentType);
    }
  }

  /**
   * Get a component from an entity
   */
  getComponent<T extends Component>(
    entityId: string,
    componentType: string
  ): T | undefined {
    const entityComponents = this.components.get(entityId);
    if (!entityComponents) {
      return undefined;
    }
    return entityComponents.get(componentType) as T | undefined;
  }

  /**
   * Get all entities that have a particular component type
   */
  getEntitiesWithComponent(componentType: string): Entity[] {
    const result: Entity[] = [];

    for (const [entityId, componentMap] of this.components.entries()) {
      if (componentMap.has(componentType)) {
        const entity = this.entities.get(entityId);
        if (entity) {
          result.push(entity);
        }
      }
    }

    return result;
  }

  /**
   * Get all components of a particular type
   */
  getAllComponentsOfType<T extends Component>(componentType: string): T[] {
    const result: T[] = [];

    for (const componentMap of this.components.values()) {
      const component = componentMap.get(componentType) as T | undefined;
      if (component) {
        result.push(component);
      }
    }

    return result;
  }

  /**
   * Clear the registry
   */
  clear(): void {
    this.entities.clear();
    this.components.clear();
  }
}
