class IsometricGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.tileWidth = 64;
    this.tileHeight = 32;

    // Load tree images
    this.trees = {
      pine: new Image(),
      palm: new Image(),
      willow: new Image(),
    };
    this.trees.pine.src = "assets/pine-tree.svg";
    this.trees.palm.src = "assets/palm-tree.svg";
    this.trees.willow.src = "assets/willow-tree.svg";

    // Generate a larger random map with 3 terrain types
    this.mapSize = 50; // 20x20 map
    this.mapData = this.generateMap();
    this.treeData = this.generateTrees();

    // Camera and movement properties
    this.cameraX = 0;
    this.cameraY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.acceleration = 2; // How quickly speed builds up
    this.maxSpeed = 20; // Maximum movement speed
    this.friction = 0.92; // Slows down movement (lower = more friction)
    this.keys = {}; // Track pressed keys

    // Zoom properties
    this.scale = 0.75;
    this.minScale = 0.2;
    this.maxScale = 2.0;
    this.zoomSpeed = 0.3;

    // FPS tracking
    this.fps = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.lastFpsUpdate = 0;

    // Mouse tracking properties
    this.mouseX = 0;
    this.mouseY = 0;
    this.hoveredTile = null;

    // Initialize minimap
    this.minimapContainer = document.getElementById("minimap");
    this.minimapCanvas = document.createElement("canvas");
    this.minimapCanvas.width = this.minimapContainer.clientWidth;
    this.minimapCanvas.height = this.minimapContainer.clientHeight;
    this.minimapContainer.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext("2d");

    this.init();
    this.setupControls();
    this.startGameLoop();
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

  generateTrees() {
    const trees = [];
    const bufferZone = 2; // Keep trees this many tiles away from the edge

    for (let y = bufferZone; y < this.mapSize - bufferZone; y++) {
      for (let x = bufferZone; x < this.mapSize - bufferZone; x++) {
        const terrain = this.mapData[y][x];

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
                this.mapData[ny][nx] === 2 // Check for water
              ) {
                hasWaterNearby = true;
              }
            }
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

  drawTree(x, y, type) {
    const iso = this.toIsometric(x, y);
    const offsetX = this.canvas.width / 2 + this.cameraX;
    const offsetY = this.canvas.height / 3 + this.cameraY;

    const treeImage = this.trees[type];
    const treeWidth = this.tileWidth * 0.5;
    const treeHeight = this.tileHeight * 1;

    this.ctx.save();
    // Translate to the bottom center of the tile (unscaled)
    this.ctx.translate(
      offsetX + iso.x * this.scale,
      offsetY + (iso.y + this.tileHeight / 2) * this.scale
    );
    // Apply scaling
    this.ctx.scale(this.scale, this.scale);

    // Draw tree image centered horizontally, bottom-aligned vertically
    this.ctx.drawImage(
      treeImage,
      -treeWidth / 2,
      -treeHeight,
      treeWidth,
      treeHeight
    );

    this.ctx.restore();
  }

  setupControls() {
    document.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });

    // Add mouse wheel zoom
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();

      // Get mouse position relative to canvas
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Store the point under the mouse in world coordinates
      const oldWorldX =
        (mouseX - this.canvas.width / 2 - this.cameraX) / this.scale;
      const oldWorldY =
        (mouseY - this.canvas.height / 3 - this.cameraY) / this.scale;

      // Update scale
      const zoomAmount = e.deltaY < 0 ? 1 + this.zoomSpeed : 1 - this.zoomSpeed;
      this.scale *= zoomAmount;
      this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale));

      // Calculate new world point after zoom
      const newWorldX =
        (mouseX - this.canvas.width / 2 - this.cameraX) / this.scale;
      const newWorldY =
        (mouseY - this.canvas.height / 3 - this.cameraY) / this.scale;

      // Adjust camera to keep the point under mouse in the same place
      this.cameraX += (newWorldX - oldWorldX) * this.scale;
      this.cameraY += (newWorldY - oldWorldY) * this.scale;
    });

    // Add mouse move tracking
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      // Update hovered tile
      this.hoveredTile = this.screenToTile(this.mouseX, this.mouseY);
    });

    // Add mouse leave handling
    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredTile = null;
    });
  }

  updateMovement() {
    // Update velocities based on key states
    if (this.keys["ArrowLeft"]) {
      this.velocityX = Math.min(
        this.velocityX + this.acceleration,
        this.maxSpeed
      );
    }
    if (this.keys["ArrowRight"]) {
      this.velocityX = Math.max(
        this.velocityX - this.acceleration,
        -this.maxSpeed
      );
    }
    if (this.keys["ArrowUp"]) {
      this.velocityY = Math.min(
        this.velocityY + this.acceleration,
        this.maxSpeed
      );
    }
    if (this.keys["ArrowDown"]) {
      this.velocityY = Math.max(
        this.velocityY - this.acceleration,
        -this.maxSpeed
      );
    }

    // Apply friction when no keys are pressed
    if (!this.keys["ArrowLeft"] && !this.keys["ArrowRight"]) {
      this.velocityX *= this.friction;
    }
    if (!this.keys["ArrowUp"] && !this.keys["ArrowDown"]) {
      this.velocityY *= this.friction;
    }

    // Update camera position
    this.cameraX += this.velocityX;
    this.cameraY += this.velocityY;

    // Stop tiny movements
    if (Math.abs(this.velocityX) < 0.01) this.velocityX = 0;
    if (Math.abs(this.velocityY) < 0.01) this.velocityY = 0;
  }

  updateFPS() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.frameCount++;

    // Update FPS counter every 500ms
    if (now - this.lastFpsUpdate > 500) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    this.lastTime = now;
  }

  renderFPS() {
    this.ctx.save();
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 16px Arial";
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `FPS: ${this.fps} | Zoom: ${this.scale.toFixed(2)}x`,
      this.canvas.width - 20,
      30
    );
    this.ctx.restore();
  }

  startGameLoop() {
    const gameLoop = () => {
      this.updateMovement();
      this.updateFPS();
      this.render();
      this.renderMinimap();
      this.renderFPS();
      requestAnimationFrame(gameLoop);
    };
    requestAnimationFrame(gameLoop);
  }

  init() {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - 150; // Subtract control panel height

    // Update minimap canvas size when window resizes
    if (this.minimapCanvas) {
      this.minimapCanvas.width = this.minimapContainer.clientWidth;
      this.minimapCanvas.height = this.minimapContainer.clientHeight;
    }

    this.render();
  }

  toIsometric(x, y) {
    return {
      x: ((x - y) * this.tileWidth) / 2,
      y: ((x + y) * this.tileHeight) / 2,
    };
  }

  getTerrainColor(type) {
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

  drawTile(x, y, type) {
    const iso = this.toIsometric(x, y);
    const offsetX = this.canvas.width / 2 + this.cameraX;
    const offsetY = this.canvas.height / 3 + this.cameraY;

    this.ctx.save();
    this.ctx.translate(
      offsetX + iso.x * this.scale,
      offsetY + iso.y * this.scale
    );
    this.ctx.scale(this.scale, this.scale);

    // Draw tile
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(this.tileWidth / 2, this.tileHeight / 2);
    this.ctx.lineTo(0, this.tileHeight);
    this.ctx.lineTo(-this.tileWidth / 2, this.tileHeight / 2);
    this.ctx.closePath();

    // Fill with terrain color
    this.ctx.fillStyle = this.getTerrainColor(type);
    this.ctx.fill();

    // Highlight hovered tile
    if (
      this.hoveredTile &&
      this.hoveredTile.x === x &&
      this.hoveredTile.y === y
    ) {
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Add a subtle glow effect
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
    }

    // Create a deterministic pattern based on tile position
    const seed = x * 10000 + y;
    const random = (n) => {
      const x = Math.sin(n + seed) * 10000;
      return x - Math.floor(x);
    };

    // Add detail dots based on terrain type
    if (type === 0 || type === 1) {
      // Apply to both grass and desert
      const dotCount = type === 0 ? 8 : 12;
      const dotRadius = type === 0 ? 1 : 0.8;
      const dotColor = type === 0 ? "#27ae60" : "#d4ab0c"; // Darker green or brown
      this.ctx.fillStyle = dotColor;

      const slope = this.tileHeight / this.tileWidth;
      const inset = 0.9; // Keep dots slightly away from the edge

      for (let i = 0; i < dotCount; i++) {
        // Generate random point potentially within the bounding box
        const randX = (random(i) - 0.5) * this.tileWidth * inset;
        const randY =
          random(i + 100) * this.tileHeight * inset +
          (this.tileHeight * (1 - inset)) / 2; // Adjust Y to be within inset bounds

        // Check if the point is inside the diamond shape using slope comparison
        const yRelativeToCenter = randY - this.tileHeight / 2;
        const maxAbsYForX =
          (this.tileHeight / 2 - slope * Math.abs(randX)) * inset;

        if (Math.abs(yRelativeToCenter) <= maxAbsYForX) {
          this.ctx.beginPath();
          this.ctx.arc(randX, randY, dotRadius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    this.ctx.restore();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw map from back to front
    for (let y = 0; y < this.mapData.length; y++) {
      for (let x = 0; x < this.mapData[y].length; x++) {
        this.drawTile(x, y, this.mapData[y][x]);
      }
    }

    // Draw trees in isometric order
    this.treeData
      .sort((a, b) => a.x + a.y - (b.x + b.y))
      .forEach((tree) => {
        this.drawTree(tree.x, tree.y, tree.type);
      });
  }

  // Convert screen coordinates to tile coordinates
  screenToTile(screenX, screenY) {
    // Adjust for camera and canvas center offset
    const x = (screenX - this.canvas.width / 2 - this.cameraX) / this.scale;
    const y = (screenY - this.canvas.height / 3 - this.cameraY) / this.scale;

    // Convert to cartesian coordinates
    const tileX = Math.floor(x / this.tileWidth + y / this.tileHeight);
    const tileY = Math.floor(y / this.tileHeight - x / this.tileWidth);

    // Check if the tile is within bounds
    if (
      tileX >= 0 &&
      tileX < this.mapSize &&
      tileY >= 0 &&
      tileY < this.mapSize
    ) {
      return { x: tileX, y: tileY };
    }
    return null;
  }

  renderMinimap() {
    if (!this.minimapCtx) return;

    // Clear the minimap canvas
    this.minimapCtx.clearRect(
      0,
      0,
      this.minimapCanvas.width,
      this.minimapCanvas.height
    );

    // Calculate the bounding box of the map in isometric space
    const mapIsoWidth = this.mapSize * this.tileWidth;
    const mapIsoHeight = this.mapSize * this.tileHeight;

    // Calculate scale to fit the minimap container exactly
    const scaleX = this.minimapCanvas.width / mapIsoWidth;
    const scaleY = this.minimapCanvas.height / mapIsoHeight;
    const minimapScale = Math.min(scaleX, scaleY); // Fit exactly edge-to-edge

    // Center the map within the canvas
    // The center of the iso map's bounding box Y is mapIsoHeight / 2
    const isoMapCenterY = mapIsoHeight / 2;
    // Translate so the scaled map center aligns with the canvas center
    const translateX = this.minimapCanvas.width / 2;
    const translateY =
      this.minimapCanvas.height / 2 - isoMapCenterY * minimapScale;

    // Draw the minimap with proper scaling and positioning
    this.minimapCtx.save();
    this.minimapCtx.translate(translateX, translateY); // Apply centering translation
    this.minimapCtx.scale(minimapScale, minimapScale); // Apply scale

    // Draw map tiles on minimap (using original iso calculation relative to 0,0)
    for (let y = 0; y < this.mapData.length; y++) {
      for (let x = 0; x < this.mapData[y].length; x++) {
        const iso = this.toIsometric(x, y);
        const tileType = this.mapData[y][x];

        // Draw simplified tiles
        this.minimapCtx.beginPath();
        this.minimapCtx.moveTo(iso.x, iso.y);
        this.minimapCtx.lineTo(
          iso.x + this.tileWidth / 2,
          iso.y + this.tileHeight / 2
        );
        this.minimapCtx.lineTo(iso.x, iso.y + this.tileHeight);
        this.minimapCtx.lineTo(
          iso.x - this.tileWidth / 2,
          iso.y + this.tileHeight / 2
        );
        this.minimapCtx.closePath();

        this.minimapCtx.fillStyle = this.getTerrainColor(tileType);
        this.minimapCtx.fill();
      }
    }

    // Draw viewport indicator on minimap
    // Viewport dimensions and center are in the same iso coordinate space
    const viewportWidth = this.canvas.width / this.scale;
    const viewportHeight = this.canvas.height / this.scale;
    const viewportCenterIso = {
      x: -this.cameraX / this.scale,
      y: -this.cameraY / this.scale,
    };

    // Draw viewport rectangle (coordinates are relative to the scaled+translated context)
    this.minimapCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    // Make line width visually consistent by dividing by the scale
    this.minimapCtx.lineWidth = 2 / minimapScale;
    this.minimapCtx.strokeRect(
      viewportCenterIso.x - viewportWidth / 2,
      viewportCenterIso.y - viewportHeight / 2,
      viewportWidth,
      viewportHeight
    );

    this.minimapCtx.restore();
  }
}

// Start the game when the window loads
window.onload = () => {
  new IsometricGame();
};
