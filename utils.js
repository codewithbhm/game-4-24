export function toIsometric(x, y, tileWidth, tileHeight) {
  return {
    x: ((x - y) * tileWidth) / 2,
    y: ((x + y) * tileHeight) / 2,
  };
}

export function getTerrainColor(type) {
  switch (type) {
    case 0:
      return "#2ecc71"; // Grass
    case 1:
      return "#f1c40f"; // Desert
    case 2:
      return "#3498db"; // Water
    default:
      return "#2ecc71";
  }
}

/**
 * Checks if a tile at the given coordinates is suitable for building.
 * @param {number} x - The x-coordinate of the tile.
 * @param {number} y - The y-coordinate of the tile.
 * @param {Array<Array<number>>} mapData - The 2D array representing the map terrain.
 * @param {Array<{x: number, y: number}>} treeData - Array of tree locations.
 * @param {Array<{x: number, y: number, type: string}>} buildings - Array of existing building locations.
 * @param {Array<{x: number, y: number, type: string}>} constructions - Array of ongoing construction locations.
 * @param {Array<{x: number, y: number, type: string}>} units - Array of existing unit locations.
 * @returns {boolean} - True if the tile is buildable, false otherwise.
 */
export function isTileBuildable(
  x,
  y,
  mapData,
  treeData,
  buildings,
  constructions,
  units
) {
  // Check if x or y are invalid (null, undefined)
  if (x === null || x === undefined || y === null || y === undefined) {
    return false;
  }

  // Check map bounds and water tile (type 2)
  if (
    y < 0 ||
    y >= mapData.length ||
    x < 0 ||
    x >= mapData[0].length ||
    mapData[y][x] === 2
  ) {
    return false;
  }

  // Check for existing trees
  if (treeData.some((tree) => tree.x === x && tree.y === y)) {
    return false;
  }

  // Check for existing buildings
  if (buildings.some((building) => building.x === x && building.y === y)) {
    return false;
  }

  // Check if a construction is already planned for this tile
  if (constructions.some((c) => c.x === x && c.y === y)) {
    // console.log(`Tile (${x}, ${y}) has ongoing construction.`); // Optional logging
    return false;
  }

  // Check if a unit is on this tile
  if (units.some((unit) => unit.x === x && unit.y === y)) {
    return false;
  }

  return true; // If none of the above conditions met, it's buildable
}
