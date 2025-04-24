export class MapGenerator {
  constructor(mapSize) {
    this.mapSize = mapSize;
  }

  generateMap() {
    // Initialize map with grass
    let map = Array(this.mapSize)
      .fill()
      .map(() => Array(this.mapSize).fill(0));

    // First pass: Generate desert regions
    const numDesertRegions = 2 + Math.floor(Math.random() * 3); // 2-4 desert regions
    for (let i = 0; i < numDesertRegions; i++) {
      // Random center point for each desert region
      const centerX = Math.floor(Math.random() * this.mapSize);
      const centerY = Math.floor(Math.random() * this.mapSize);
      const size = 3 + Math.floor(Math.random() * 4); // Random size for each region

      // Create desert region with some randomness
      for (let y = 0; y < this.mapSize; y++) {
        for (let x = 0; x < this.mapSize; x++) {
          const distFromCenter = Math.sqrt(
            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
          );

          if (distFromCenter < size) {
            // Core desert area
            map[y][x] = 1;
          } else if (distFromCenter < size + 2) {
            // Transition zone with randomness
            if (Math.random() < 0.6) {
              map[y][x] = 1;
            }
          }
        }
      }
    }

    // Second pass: Add water bodies
    for (let y = 0; y < this.mapSize; y++) {
      for (let x = 0; x < this.mapSize; x++) {
        // Create water in certain regions
        if (Math.random() < 0.03) {
          this.createWaterBody(map, x, y);
        }
      }
    }

    // Third pass: Smooth the terrain
    map = this.smoothTerrain(map);

    return map;
  }

  createWaterBody(map, startX, startY, depth = 0) {
    if (depth > 4) return;
    if (
      startX < 0 ||
      startX >= this.mapSize ||
      startY < 0 ||
      startY >= this.mapSize
    )
      return;
    if (map[startY][startX] === 2) return; // Already water

    map[startY][startX] = 2; // Set to water

    // Recursively spread water with decreasing probability
    const spreadChance = 0.5 - depth * 0.1;

    // Spread in 4 directions
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dx, dy] of directions) {
      if (Math.random() < spreadChance) {
        this.createWaterBody(map, startX + dx, startY + dy, depth + 1);
      }
    }
  }

  smoothTerrain(map) {
    const newMap = Array(this.mapSize)
      .fill()
      .map(() => Array(this.mapSize).fill(0));

    for (let y = 0; y < this.mapSize; y++) {
      for (let x = 0; x < this.mapSize; x++) {
        // Count neighbors of each type
        const counts = [0, 0, 0]; // [grass, desert, water]

        // Check 3x3 neighborhood
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.mapSize && ny >= 0 && ny < this.mapSize) {
              counts[map[ny][nx]]++;
            }
          }
        }

        // Set tile to most common neighbor type
        let maxCount = 0;
        let maxType = map[y][x];
        for (let i = 0; i < counts.length; i++) {
          if (counts[i] > maxCount) {
            maxCount = counts[i];
            maxType = i;
          }
        }

        // Keep water as is to maintain water body shapes
        if (map[y][x] === 2) {
          newMap[y][x] = 2;
        } else {
          newMap[y][x] = maxType;
        }
      }
    }

    return newMap;
  }

  generateTrees(mapData) {
    const trees = [];
    const bufferZone = 2; // Keep trees this many tiles away from the edge

    for (let y = bufferZone; y < this.mapSize - bufferZone; y++) {
      for (let x = bufferZone; x < this.mapSize - bufferZone; x++) {
        const terrain = mapData[y][x];

        // Add trees based on terrain type with different probabilities
        if (terrain === 0 && Math.random() < 0.06) {
          // Grass - Pine trees
          trees.push({
            x: x,
            y: y,
            type: "pine",
          });
        } else if (terrain === 1 && Math.random() < 0.03) {
          // Desert - Palm trees
          trees.push({
            x: x,
            y: y,
            type: "palm",
          });
        } else if (terrain === 0) {
          // Only on grass, near water
          // Check if there's water nearby for willow trees
          let hasWaterNearby = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (
                nx >= bufferZone &&
                nx < this.mapSize - bufferZone &&
                ny >= bufferZone &&
                ny < this.mapSize - bufferZone &&
                mapData[ny][nx] === 2 // Check for water
              ) {
                hasWaterNearby = true;
                break; // Found water, no need to check further neighbors
              }
            }
            if (hasWaterNearby) break;
          }
          // Place willow trees on grass near water edges
          if (hasWaterNearby && Math.random() < 0.08) {
            trees.push({
              x: x,
              y: y,
              type: "willow",
            });
          }
        }
      }
    }
    return trees;
  }
}
