/**
 * A* Pathfinding implementation for the isometric game
 * Allows units to find paths around obstacles (water, trees, buildings, units)
 */

export class Pathfinder {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Find a path from start to target coordinates
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @returns {Array|null} - Array of path coordinates [{x,y}] or null if no path found
   */
  findPath(startX, startY, targetX, targetY) {
    const mapSize = this.stateManager.mapSize;
    const gameState = this.stateManager.getState();

    // If target is not walkable, find closest walkable tile
    if (!this.isWalkable(targetX, targetY, gameState)) {
      const alternativeTarget = this.findNearestWalkableTile(
        targetX,
        targetY,
        gameState
      );
      if (alternativeTarget) {
        targetX = alternativeTarget.x;
        targetY = alternativeTarget.y;
      } else {
        return null; // No walkable tile found near target
      }
    }

    // Initialize open and closed sets
    const openSet = [];
    const closedSet = new Set();

    // Add starting node to open set
    openSet.push({
      x: startX,
      y: startY,
      g: 0, // Cost from start to current node
      h: this.heuristic(startX, startY, targetX, targetY), // Estimated cost to target
      f: this.heuristic(startX, startY, targetX, targetY), // Total cost (g + h)
      parent: null, // Reference to parent node for path reconstruction
    });

    // Main A* loop
    while (openSet.length > 0) {
      // Sort open set by f cost and get node with lowest cost
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();

      // Add current node to closed set
      closedSet.add(`${current.x},${current.y}`);

      // Check if we've reached the target
      if (current.x === targetX && current.y === targetY) {
        return this.reconstructPath(current);
      }

      // Check all neighboring tiles
      const neighbors = this.getNeighbors(current.x, current.y, mapSize);
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`;

        // Skip if neighbor is in closed set
        if (closedSet.has(key)) continue;

        // Skip if neighbor is not walkable
        if (!this.isWalkable(neighbor.x, neighbor.y, gameState)) continue;

        // Calculate new cost to neighbor
        const gCost = current.g + 1;

        // Check if neighbor is in open set
        const existingNeighbor = openSet.find(
          (node) => node.x === neighbor.x && node.y === neighbor.y
        );

        if (!existingNeighbor) {
          // Add neighbor to open set
          openSet.push({
            x: neighbor.x,
            y: neighbor.y,
            g: gCost,
            h: this.heuristic(neighbor.x, neighbor.y, targetX, targetY),
            f: gCost + this.heuristic(neighbor.x, neighbor.y, targetX, targetY),
            parent: current,
          });
        } else if (gCost < existingNeighbor.g) {
          // Update existing neighbor with better path
          existingNeighbor.g = gCost;
          existingNeighbor.f = gCost + existingNeighbor.h;
          existingNeighbor.parent = current;
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Manhattan distance heuristic
   */
  heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /**
   * Get all walkable neighbors for a tile
   */
  getNeighbors(x, y, mapSize) {
    const neighbors = [];
    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 1, y: 0 }, // Right
      { x: 0, y: 1 }, // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: -1 }, // Diagonal: Up-Right
      { x: 1, y: 1 }, // Diagonal: Down-Right
      { x: -1, y: 1 }, // Diagonal: Down-Left
      { x: -1, y: -1 }, // Diagonal: Up-Left
    ];

    for (const dir of directions) {
      const newX = x + dir.x;
      const newY = y + dir.y;

      // Check if within map bounds
      if (newX >= 0 && newX < mapSize && newY >= 0 && newY < mapSize) {
        neighbors.push({ x: newX, y: newY });
      }
    }

    return neighbors;
  }

  /**
   * Check if a tile is walkable (not water, tree, building or unit)
   */
  isWalkable(x, y, gameState) {
    // Check map bounds
    if (x < 0 || y < 0 || x >= gameState.mapSize || y >= gameState.mapSize) {
      return false;
    }

    // Check terrain (water - type 2 - is not walkable)
    if (gameState.mapData[y][x] === 2) {
      return false;
    }

    // Check trees
    if (gameState.treeData.some((tree) => tree.x === x && tree.y === y)) {
      return false;
    }

    // Check buildings
    if (
      gameState.buildings.some(
        (building) => building.x === x && building.y === y
      )
    ) {
      return false;
    }

    // Check constructions
    if (
      gameState.constructions.some(
        (construction) => construction.x === x && construction.y === y
      )
    ) {
      return false;
    }

    // Check units (using Math.floor for fractional coordinates)
    if (
      gameState.units.some(
        (unit) => Math.floor(unit.x) === x && Math.floor(unit.y) === y
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * Find nearest walkable tile to the target
   */
  findNearestWalkableTile(targetX, targetY, gameState) {
    const checked = new Set();
    const queue = [{ x: targetX, y: targetY, dist: 0 }];

    // Breadth-first search for nearest walkable tile
    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      if (checked.has(key)) continue;
      checked.add(key);

      // If current tile is walkable, return it
      if (this.isWalkable(current.x, current.y, gameState)) {
        return { x: current.x, y: current.y };
      }

      // Check up to 3 tiles away (adjust as needed)
      if (current.dist >= 5) continue;

      // Add neighbors to queue
      const neighbors = this.getNeighbors(
        current.x,
        current.y,
        gameState.mapSize
      );
      for (const neighbor of neighbors) {
        queue.push({
          x: neighbor.x,
          y: neighbor.y,
          dist: current.dist + 1,
        });
      }
    }

    return null; // No walkable tile found
  }

  /**
   * Reconstruct path from end node to start node
   */
  reconstructPath(endNode) {
    const path = [];
    let current = endNode;

    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }
}
