import { isTileBuildable } from "./utils.js";
import { Pathfinder } from "./pathfinder.js";

export class StateManager {
  constructor(mapSize, mapGenerator) {
    this.mapSize = mapSize;
    this.mapGenerator = mapGenerator; // Needed to generate initial state

    // Core Game State
    this.mapData = [];
    this.treeData = [];
    this.buildings = []; // { x, y, type }
    this.units = []; // { x, y, type, targetX, targetY, path, currentWaypoint }
    this.constructions = []; // { x, y, type, startTime, buildTime, progress, builderId }
    this.trainingQueue = []; // { buildingX, buildingY, unitType, startTime, trainTime, progress }

    // Selection State
    this.selectedBuilding = null;
    this.selectedUnit = null;
    this.selectedBuildingType = null; // Build mode state

    // Other state (could be moved if needed)
    this.hoveredTile = null; // Still potentially useful for non-UI logic

    // Initialize pathfinder
    this.pathfinder = new Pathfinder(this);
  }

  initializeState() {
    // Generate initial map and trees
    this.mapData = this.mapGenerator.generateMap();
    this.treeData = this.mapGenerator.generateTrees(this.mapData);
    // Place initial town center
    this.placeInitialTownCenter();
  }

  // --- Building Management ---
  addBuilding(x, y, type) {
    this.buildings.push({ x, y, type });
    console.log(`StateManager: Added ${type} building at (${x}, ${y})`);
  }

  // --- Construction Management ---
  addConstruction(x, y, type, buildTime) {
    const newConstruction = {
      x,
      y,
      type,
      startTime: performance.now(),
      buildTime,
      progress: 0,
      builderId: null, // Track which villager is building
      isPaused: false, // Track if construction is paused
      lastUpdateTime: performance.now(), // Track last time the progress was updated
      totalElapsedTime: 0, // Track the actual elapsed building time
    };
    this.constructions.push(newConstruction);
    console.log(
      `StateManager: Added construction site for ${type} at (${x}, ${y})`
    );
    return newConstruction; // Return it in case caller needs it
  }

  updateConstructions() {
    const now = performance.now();
    const completedConstructions = [];
    this.constructions = this.constructions.filter((construction) => {
      // Check if a builder is assigned and near the construction site
      const builder = this.findBuilderForConstruction(construction);
      const builderPresent = builder !== null;

      // Calculate time since last update
      const timeSinceUpdate = now - construction.lastUpdateTime;

      // Update the builder ID and pause state
      if (builderPresent) {
        // If a builder is present
        construction.builderId = builder.id;

        // If construction was paused and now resuming
        if (construction.isPaused) {
          construction.isPaused = false;
          // Reset the start of this building session
          console.log(
            `StateManager: Construction resumed at (${construction.x}, ${construction.y})`
          );
        }

        // Only add to elapsed time if builder is present
        construction.totalElapsedTime += timeSinceUpdate;

        // Check if construction is complete
        if (construction.totalElapsedTime >= construction.buildTime) {
          // Mark for completion (add building after filtering)
          completedConstructions.push({
            x: construction.x,
            y: construction.y,
            type: construction.type,
          });
          return false; // Remove from constructions
        } else {
          // Update progress based on actual elapsed time
          construction.progress =
            construction.totalElapsedTime / construction.buildTime;
        }
      } else {
        // No builder present, pause construction if not already paused
        if (!construction.isPaused) {
          construction.isPaused = true;
          console.log(
            `StateManager: Construction paused at (${construction.x}, ${construction.y})`
          );
        }
        // Progress doesn't change when paused
      }

      // Update the last update time
      construction.lastUpdateTime = now;

      return true; // Keep in constructions
    });

    // Add completed buildings
    completedConstructions.forEach((b) => {
      this.addBuilding(b.x, b.y, b.type);
    });
  }

  // Find a villager that's at the construction site
  findBuilderForConstruction(construction) {
    const BUILDER_DISTANCE_THRESHOLD = 1.0; // How close the villager needs to be

    for (const unit of this.units) {
      if (unit.type === "villager") {
        const dx = unit.x - construction.x;
        const dy = unit.y - construction.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= BUILDER_DISTANCE_THRESHOLD) {
          return unit;
        }
      }
    }

    return null;
  }

  // --- Unit Management ---
  addUnit(x, y, type) {
    const id = Date.now() + Math.floor(Math.random() * 1000); // Generate a unique ID
    this.units.push({
      id,
      x,
      y,
      type,
      targetX: null,
      targetY: null,
      path: null,
      currentWaypoint: 0,
    });
    console.log(`StateManager: Added ${type} unit at (${x}, ${y})`);
  }

  updateUnits(speed) {
    this.units.forEach((unit) => {
      if (unit.path && unit.path.length > 0) {
        // If we have a path, follow it waypoint by waypoint
        const waypoint = unit.path[unit.currentWaypoint];

        // Calculate distance to current waypoint
        const dx = waypoint.x - unit.x;
        const dy = waypoint.y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= speed) {
          // Reached the current waypoint
          unit.x = waypoint.x;
          unit.y = waypoint.y;

          // Move to next waypoint
          unit.currentWaypoint++;

          // If we've reached the final waypoint, clear the path
          if (unit.currentWaypoint >= unit.path.length) {
            unit.path = null;
            unit.currentWaypoint = 0;

            // If this unit was going to a construction site, check if it reached it
            if (
              unit.buildTargetX !== undefined &&
              unit.buildTargetY !== undefined
            ) {
              // Check if the construction still exists at the target
              const construction = this.constructions.find(
                (c) => c.x === unit.buildTargetX && c.y === unit.buildTargetY
              );

              if (construction) {
                // Villager has reached the construction site, assign it as the builder
                construction.builderId = unit.id;
                construction.isPaused = false;

                // Keep the buildTarget so the unit remains assigned to this construction
              } else {
                // Construction no longer exists, clear the build target
                delete unit.buildTargetX;
                delete unit.buildTargetY;
              }
            }

            unit.targetX = null;
            unit.targetY = null;
            console.log(
              `StateManager: Unit reached final destination (${unit.x}, ${unit.y})`,
              unit
            );
          }
        } else {
          // Move towards current waypoint
          unit.x += (dx / distance) * speed;
          unit.y += (dy / distance) * speed;
        }
      } else if (unit.targetX !== null && unit.targetY !== null) {
        // Direct movement without pathfinding (keeping this for backward compatibility)
        const dx = unit.targetX - unit.x;
        const dy = unit.targetY - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= speed) {
          // Snap to target and clear target
          unit.x = unit.targetX;
          unit.y = unit.targetY;

          // If this unit was going to a construction site, check if it reached it
          if (
            unit.buildTargetX !== undefined &&
            unit.buildTargetY !== undefined
          ) {
            // Check if the construction still exists at the target
            const construction = this.constructions.find(
              (c) => c.x === unit.buildTargetX && c.y === unit.buildTargetY
            );

            if (construction) {
              // Villager has reached the construction site, assign it as the builder
              construction.builderId = unit.id;
              construction.isPaused = false;

              // Keep the buildTarget so the unit remains assigned to this construction
            } else {
              // Construction no longer exists, clear the build target
              delete unit.buildTargetX;
              delete unit.buildTargetY;
            }
          }

          unit.targetX = null;
          unit.targetY = null;
          console.log(
            `StateManager: Unit reached target (${unit.x}, ${unit.y})`,
            unit
          );
        } else {
          // Move towards target
          unit.x += (dx / distance) * speed;
          unit.y += (dy / distance) * speed;
        }
      }
    });
  }

  commandUnitMove(unit, targetX, targetY) {
    if (!unit) return;

    // Check if the unit is currently building
    const construction = this.constructions.find(
      (c) => c.builderId === unit.id
    );
    if (construction) {
      // Mark the construction as paused since the builder is leaving
      construction.isPaused = true;
      construction.builderId = null;
    }

    // Use pathfinding to find a path around obstacles
    const startX = Math.floor(unit.x);
    const startY = Math.floor(unit.y);

    // Find path
    const path = this.pathfinder.findPath(startX, startY, targetX, targetY);

    if (path && path.length > 0) {
      // If pathfinding succeeded, use the path
      unit.path = path;
      unit.currentWaypoint = 0;
      unit.targetX = targetX;
      unit.targetY = targetY;
      console.log(
        `StateManager: Commanded unit to move to (${targetX}, ${targetY}) with path of ${path.length} waypoints`,
        unit
      );
    } else {
      // If pathfinding failed, fallback to direct movement
      console.log(
        `StateManager: No path found to (${targetX}, ${targetY}), using direct movement`
      );
      unit.targetX = targetX;
      unit.targetY = targetY;
      unit.path = null;
      unit.currentWaypoint = 0;
    }
  }

  // Command a villager to build at a construction site
  commandUnitBuild(unit, constructionX, constructionY) {
    if (!unit || unit.type !== "villager") return;

    // Find the construction at the given coordinates
    const construction = this.constructions.find(
      (c) => c.x === constructionX && c.y === constructionY
    );

    if (!construction) {
      console.log(
        `StateManager: No construction found at (${constructionX}, ${constructionY})`
      );
      return;
    }

    // First move the villager to the construction site
    this.commandUnitMove(unit, constructionX, constructionY);

    // Tag the unit with its build target so we know what it's trying to build
    unit.buildTargetX = constructionX;
    unit.buildTargetY = constructionY;

    console.log(
      `StateManager: Villager commanded to build at (${constructionX}, ${constructionY})`
    );
  }

  // --- Training Queue Management ---
  addTrainingItem(buildingX, buildingY, unitType, trainTime) {
    this.trainingQueue.push({
      buildingX,
      buildingY,
      unitType,
      startTime: performance.now(),
      trainTime,
      progress: 0,
    });
    console.log(
      `StateManager: Added ${unitType} to training queue from (${buildingX}, ${buildingY}).`
    );
  }

  updateTrainingQueue() {
    const now = performance.now();
    const trainedUnits = []; // Units to spawn after filtering
    this.trainingQueue = this.trainingQueue.filter((item) => {
      const elapsed = now - item.startTime;
      if (elapsed >= item.trainTime) {
        // Find spawn point and mark for spawning
        const spawnPoint = this.findSpawnPoint(item.buildingX, item.buildingY);
        if (spawnPoint) {
          trainedUnits.push({
            x: spawnPoint.x,
            y: spawnPoint.y,
            type: item.unitType,
          });
        } else {
          console.warn(
            `StateManager: Could not find spawn point for ${item.unitType} near (${item.buildingX}, ${item.buildingY})`
          );
        }
        return false; // Remove from queue
      } else {
        item.progress = elapsed / item.trainTime;
        return true; // Keep in queue
      }
    });

    // Add newly trained units
    trainedUnits.forEach((u) => {
      this.addUnit(u.x, u.y, u.type);
    });
  }

  // --- Selection Management ---
  setSelectedBuilding(building) {
    this.selectedBuilding = building;
    if (building) this.selectedUnit = null; // Deselect unit when selecting building
  }

  setSelectedUnit(unit) {
    this.selectedUnit = unit;
    if (unit) this.selectedBuilding = null; // Deselect building when selecting unit
  }

  setSelectedBuildingType(type) {
    if (type === this.selectedBuildingType) {
      this.selectedBuildingType = null; // Toggle off
    } else {
      this.selectedBuildingType = type;
    }

    // Deselect building/unit only if entering a *new* build mode
    if (this.selectedBuildingType !== null) {
      this.selectedBuilding = null;
      // Keep villager selected if entering build mode
      if (this.selectedUnit && this.selectedUnit.type !== "villager") {
        this.selectedUnit = null;
      }
    }
    console.log(
      `StateManager: Selected building type: ${this.selectedBuildingType}`
    );
  }

  clearSelections() {
    this.selectedBuilding = null;
    this.selectedUnit = null;
    this.selectedBuildingType = null;
    console.log(`StateManager: Cleared selections.`);
  }

  // --- Utility / State Query ---
  isTileOccupied(x, y) {
    // Check buildings
    if (this.buildings.some((b) => b.x === x && b.y === y)) return true;
    // Check constructions
    if (this.constructions.some((c) => c.x === x && c.y === y)) return true;
    // Check units (consider if units block construction)
    if (this.units.some((u) => Math.floor(u.x) === x && Math.floor(u.y) === y))
      return true; // Use floor for units
    // Check trees
    if (this.treeData.some((t) => t.x === x && t.y === y)) return true;
    return false;
  }

  isTileBuildable(x, y) {
    // Use the imported utility function, passing current state
    return isTileBuildable(
      x,
      y,
      this.mapData,
      this.treeData,
      this.buildings,
      this.constructions,
      this.units
    );
  }

  findSpawnPoint(buildingX, buildingY) {
    // Find a valid spawn point near a building
    for (let radius = 1; radius <= 3; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const checkX = buildingX + dx;
          const checkY = buildingY + dy;
          if (
            checkX < 0 ||
            checkX >= this.mapSize ||
            checkY < 0 ||
            checkY >= this.mapSize
          )
            continue;

          // Use internal check for buildable status (empty land)
          if (this.isTileBuildable(checkX, checkY)) {
            return { x: checkX, y: checkY };
          }
        }
      }
    }
    return null; // No suitable spawn point found nearby
  }

  placeInitialTownCenter() {
    let placed = false;
    const searchRadius = Math.floor(this.mapSize / 4);
    const centerX = Math.floor(this.mapSize / 2);
    const centerY = Math.floor(this.mapSize / 2);

    for (let r = 0; r <= searchRadius && !placed; r++) {
      for (let dx = -r; dx <= r && !placed; dx++) {
        for (let dy = -r; dy <= r && !placed; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = centerX + dx;
          const y = centerY + dy;
          if (x >= 0 && x < this.mapSize && y >= 0 && y < this.mapSize) {
            // Use internal check
            if (this.isTileBuildable(x, y)) {
              this.addBuilding(x, y, "town_center");
              console.log(
                `StateManager: Placed initial town center at (${x}, ${y})`
              );
              placed = true;
              break;
            }
          }
        }
      }
    }

    if (!placed) {
      console.warn(
        "StateManager: Could not find suitable spot near center for town center, searching whole map..."
      );
      for (let y = 0; y < this.mapSize && !placed; y++) {
        for (let x = 0; x < this.mapSize && !placed; x++) {
          if (this.isTileBuildable(x, y)) {
            this.addBuilding(x, y, "town_center");
            console.log(
              `StateManager: Placed initial town center at (${x}, ${y}) (fallback)`
            );
            placed = true;
          }
        }
      }
    }

    if (!placed) {
      console.error(
        "StateManager: FATAL: Could not find any suitable location to place the initial town center!"
      );
    }
  }

  // Find a construction at the given coordinates
  getConstructionAt(x, y) {
    return this.constructions.find(
      (construction) => construction.x === x && construction.y === y
    );
  }

  // --- Getters for state (read-only access for other modules) ---
  getState() {
    return {
      mapData: this.mapData,
      treeData: this.treeData,
      buildings: this.buildings,
      units: this.units,
      constructions: this.constructions,
      trainingQueue: this.trainingQueue,
      selectedBuilding: this.selectedBuilding,
      selectedUnit: this.selectedUnit,
      selectedBuildingType: this.selectedBuildingType,
      hoveredTile: this.hoveredTile,
      mapSize: this.mapSize,
      // Avoid returning mapGenerator itself unless needed
    };
  }

  // --- Setters (use specific methods above for modifications) ---
  setHoveredTile(tile) {
    this.hoveredTile = tile;
  }
}
