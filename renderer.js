import { toIsometric, getTerrainColor } from "./utils.js";

export class Renderer {
  constructor(
    ctx,
    canvas,
    tileWidth,
    tileHeight,
    trees,
    buildingAssets,
    unitAssets
  ) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.trees = trees; // Preloaded tree images
    this.buildingAssets = buildingAssets; // Preloaded building assets dictionary
    this.unitAssets = unitAssets; // Preloaded unit assets dictionary
  }

  render(
    cameraX,
    cameraY,
    scale,
    mapData,
    treeData,
    hoveredTile,
    fps,
    selectedBuildingType,
    buildings, // Receive buildings data
    canBuildOnHovered, // Receive buildability status of hovered tile
    constructions, // Receive ongoing constructions
    selectedBuilding, // Receive selected building
    selectedUnit, // Receive selected unit (for potential highlighting)
    units // Receive units array
  ) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw map tiles from back to front
    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        this.drawTile(
          x,
          y,
          mapData[y][x],
          cameraX,
          cameraY,
          scale,
          hoveredTile,
          selectedBuildingType
        );
      }
    }

    // Combine trees, buildings, and constructions into a single sorted list
    const structures = [
      ...treeData.map((t) => ({ ...t, renderType: "tree" })),
      ...buildings.map((b) => ({ ...b, renderType: "building" })),
      ...constructions.map((c) => ({ ...c, renderType: "construction" })),
    ].sort((a, b) => a.x + a.y - (b.x + b.y));

    structures.forEach((structure) => {
      if (structure.renderType === "tree") {
        this.drawTree(
          structure.x,
          structure.y,
          structure.treeType || "pine",
          cameraX,
          cameraY,
          scale
        );
      } else if (structure.renderType === "building") {
        this.drawBuilding(
          structure.x,
          structure.y,
          structure.type,
          cameraX,
          cameraY,
          scale
        );
      } else if (structure.renderType === "construction") {
        this.drawConstruction(
          structure.x,
          structure.y,
          structure.type,
          cameraX,
          cameraY,
          scale,
          structure.progress
        );
      }
    });

    // --- Draw Units --- Separate loop after structures for clarity
    // Units should also be sorted by render order (y + x)
    // Ensure units is iterable before spreading
    const sortedUnits = Array.isArray(units)
      ? [...units].sort((a, b) => a.x + a.y - (b.x + b.y))
      : [];

    sortedUnits.forEach((unit) => {
      this.drawUnit(unit.x, unit.y, unit.type, cameraX, cameraY, scale);
    });
    // --- End Draw Units ---

    // Draw placement preview if a building type is selected and hovering over a tile
    if (selectedBuildingType && hoveredTile) {
      this.drawPlacementPreview(
        hoveredTile.x,
        hoveredTile.y,
        selectedBuildingType,
        cameraX,
        cameraY,
        scale,
        canBuildOnHovered
      );
    }

    // Render FPS and Zoom
    this.renderFPS(fps, scale);
  }

  drawTile(
    x,
    y,
    type,
    cameraX,
    cameraY,
    scale,
    hoveredTile,
    selectedBuildingType
  ) {
    const iso = toIsometric(x, y, this.tileWidth, this.tileHeight);
    const offsetX = this.canvas.width / 2 + cameraX;
    const offsetY = this.canvas.height / 3 + cameraY;

    this.ctx.save();
    this.ctx.translate(offsetX + iso.x * scale, offsetY + iso.y * scale);
    this.ctx.scale(scale, scale);

    // Draw tile shape
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(this.tileWidth / 2, this.tileHeight / 2);
    this.ctx.lineTo(0, this.tileHeight);
    this.ctx.lineTo(-this.tileWidth / 2, this.tileHeight / 2);
    this.ctx.closePath();

    // Fill with terrain color
    this.ctx.fillStyle = getTerrainColor(type);
    this.ctx.fill();

    // Highlight hovered tile ONLY if in build mode
    if (
      selectedBuildingType &&
      hoveredTile &&
      hoveredTile.x === x &&
      hoveredTile.y === y
    ) {
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.lineWidth = 2 / scale; // Adjust line width based on scale
      this.ctx.stroke();

      // Add a subtle glow effect
      this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      this.ctx.lineWidth = 4 / scale;
      this.ctx.stroke();
    }

    // Add detail dots based on terrain type
    this.drawTileDetails(x, y, type);

    // If building, draw preview *over* tile highlight but *under* structures
    // Moved the preview drawing logic after structure loop

    this.ctx.restore();
  }

  drawTileDetails(x, y, type) {
    // Create a deterministic pattern based on tile position
    const seed = x * 10000 + y;
    const random = (n) => {
      const val = Math.sin(n + seed) * 10000;
      return val - Math.floor(val);
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
  }

  drawTree(x, y, type, cameraX, cameraY, scale) {
    const iso = toIsometric(x, y, this.tileWidth, this.tileHeight);
    const offsetX = this.canvas.width / 2 + cameraX;
    const offsetY = this.canvas.height / 3 + cameraY;

    const treeImage = this.trees[type];
    if (!treeImage || !treeImage.complete || treeImage.naturalHeight === 0)
      return; // Skip if image not loaded

    const treeWidth = this.tileWidth * 0.5;
    const treeHeight = this.tileHeight * 1;

    this.ctx.save();
    // Translate to the bottom center of the tile (unscaled isometric coordinates)
    this.ctx.translate(
      offsetX + iso.x * scale,
      offsetY + (iso.y + this.tileHeight / 2) * scale // Align to bottom-center of the tile base
    );
    // Apply scaling
    this.ctx.scale(scale, scale);

    // Draw tree image centered horizontally, bottom-aligned vertically
    this.ctx.drawImage(
      treeImage,
      -treeWidth / 2, // Center horizontally
      -treeHeight, // Position top edge so bottom aligns with the translated point
      treeWidth,
      treeHeight
    );

    this.ctx.restore();
  }

  drawBuilding(x, y, type, cameraX, cameraY, scale) {
    const iso = toIsometric(x, y, this.tileWidth, this.tileHeight);
    const offsetX = this.canvas.width / 2 + cameraX;
    const offsetY = this.canvas.height / 3 + cameraY;

    const buildingImage = this.buildingAssets[type];
    if (
      !buildingImage ||
      !buildingImage.complete ||
      buildingImage.naturalHeight === 0
    )
      return; // Skip if image not loaded or type is invalid

    // Adjust dimensions based on the asset (can be dynamic later if needed)
    // For now, assuming similar dimensions, but you might want specific sizes per type
    const buildingWidth = this.tileWidth * 0.7;
    const buildingHeight = this.tileHeight * 1.2;

    this.ctx.save();
    // Translate to the bottom center of the tile
    this.ctx.translate(
      offsetX + iso.x * scale,
      offsetY + (iso.y + this.tileHeight / 2) * scale
    );
    this.ctx.scale(scale, scale);

    // Draw building image centered horizontally, bottom-aligned vertically
    this.ctx.drawImage(
      buildingImage,
      -buildingWidth / 2,
      -buildingHeight,
      buildingWidth,
      buildingHeight
    );

    this.ctx.restore();
  }

  drawConstruction(x, y, type, cameraX, cameraY, scale, progress) {
    const iso = toIsometric(x, y, this.tileWidth, this.tileHeight);
    const offsetX = this.canvas.width / 2 + cameraX;
    const offsetY = this.canvas.height / 3 + cameraY;

    const buildingImage = this.buildingAssets[type];
    if (
      !buildingImage ||
      !buildingImage.complete ||
      buildingImage.naturalHeight === 0
    )
      return; // Skip if image not loaded

    // Adjust dimensions as needed
    const buildingWidth = this.tileWidth * 0.7;
    const buildingHeight = this.tileHeight * 1.2;

    this.ctx.save();

    // Translate to the bottom center of the tile
    const scaledTranslateX = offsetX + iso.x * scale;
    const scaledTranslateY = offsetY + (iso.y + this.tileHeight / 2) * scale;

    this.ctx.translate(scaledTranslateX, scaledTranslateY);
    this.ctx.scale(scale, scale);

    // Apply opacity based on progress (fade-in effect)
    const opacity = 0.3 + progress * 0.7;
    this.ctx.globalAlpha = opacity;

    // Draw building image centered horizontally, bottom-aligned vertically
    this.ctx.drawImage(
      buildingImage,
      -buildingWidth / 2,
      -buildingHeight,
      buildingWidth,
      buildingHeight
    );

    // Reset alpha for progress bar
    this.ctx.globalAlpha = 1.0;

    // --- Draw Progress Bar --- scaled coordinates relative to the scaled building
    const barWidth = this.tileWidth * 0.8; // Use unscaled tileWidth for consistent bar size appearance
    const barHeight = 6; // Fixed pixel height for the bar (adjust as needed)
    const barX = -barWidth / 2; // Center the bar horizontally relative to the building center
    const barY = -buildingHeight - barHeight - 5; // Position above the building image (add some padding)
    this.ctx.fillStyle = "#555";
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    this.ctx.fillStyle = "#4CAF50"; // Green color
    this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 1; // Use unscaled line width
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Restore context state (scale, translation, alpha)
    this.ctx.restore();
  }

  drawPlacementPreview(x, y, type, cameraX, cameraY, scale, canBuild) {
    const iso = toIsometric(x, y, this.tileWidth, this.tileHeight);
    const offsetX = this.canvas.width / 2 + cameraX;
    const offsetY = this.canvas.height / 3 + cameraY;

    const buildingImage = this.buildingAssets[type];
    if (
      !buildingImage ||
      !buildingImage.complete ||
      buildingImage.naturalHeight === 0
    )
      return; // Skip if image not loaded for the preview

    // Adjust dimensions as needed
    const buildingWidth = this.tileWidth * 0.7;
    const buildingHeight = this.tileHeight * 1.2;

    this.ctx.save();
    this.ctx.globalAlpha = 0.5; // Semi-transparent
    this.ctx.translate(
      offsetX + iso.x * scale,
      offsetY + (iso.y + this.tileHeight / 2) * scale
    );
    this.ctx.scale(scale, scale);

    // Tint red if cannot build
    if (!canBuild) {
      // Apply a red tint using filter or by drawing a red overlay
      // Using filter for simplicity:
      this.ctx.filter = "brightness(1.1) saturate(1.5) hue-rotate(350deg)";
    }

    this.ctx.drawImage(
      buildingImage,
      -buildingWidth / 2,
      -buildingHeight,
      buildingWidth,
      buildingHeight
    );

    // Restore alpha and filter
    // Important: Reset the filter even if it wasn't applied to avoid artifacts
    this.ctx.filter = "none";
    this.ctx.restore();
  }

  drawUnit(x, y, type, cameraX, cameraY, scale) {
    const iso = toIsometric(x, y, this.tileWidth, this.tileHeight);
    const offsetX = this.canvas.width / 2 + cameraX;
    const offsetY = this.canvas.height / 3 + cameraY;

    const unitImage = this.unitAssets[type];
    if (!unitImage || !unitImage.complete || unitImage.naturalHeight === 0) {
      console.warn(`Unit image not loaded or invalid for type: ${type}`);
      return; // Skip if image not loaded or type is invalid
    }

    // Determine unit size - make villagers smaller than buildings
    const unitWidth = this.tileWidth * 0.4; // Smaller width
    const unitHeight = this.tileHeight * 0.8; // Adjust height accordingly

    this.ctx.save();
    // Translate to the bottom center of the tile
    this.ctx.translate(
      offsetX + iso.x * scale,
      offsetY + (iso.y + this.tileHeight / 2) * scale
    );
    this.ctx.scale(scale, scale);

    // Draw unit image centered horizontally, bottom-aligned vertically
    this.ctx.drawImage(
      unitImage,
      -unitWidth / 2,
      -unitHeight,
      unitWidth,
      unitHeight
    );

    this.ctx.restore();
  }

  renderFPS(fps, scale) {
    this.ctx.save();
    this.ctx.fillStyle = "white";
    this.ctx.font = "bold 16px Arial";
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `FPS: ${fps} | Zoom: ${scale.toFixed(2)}x`,
      this.canvas.width - 20,
      30
    );
    this.ctx.restore();
  }

  renderUnits(units, selectedUnit) {
    // ... existing code ...

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const asset = this.unitAssets[unit.type];

      // ... existing code for rendering unit ...

      // Render unit selection circle if selected
      if (selectedUnit === unit) {
        // ... existing code for selection circle ...

        // Render path if unit has one
        if (unit.path && unit.path.length > 0) {
          this.renderPath(unit);
        }
      }
    }
  }

  // Add new method to render path
  renderPath(unit) {
    this.ctx.save();

    // Set path style
    this.ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();

    // Start at current unit position
    const startPos = this.mapToScreen(unit.x, unit.y);
    this.ctx.moveTo(startPos.x, startPos.y);

    // Draw line to each waypoint
    for (let i = unit.currentWaypoint; i < unit.path.length; i++) {
      const waypoint = unit.path[i];
      const waypointPos = this.mapToScreen(waypoint.x, waypoint.y);
      this.ctx.lineTo(waypointPos.x, waypointPos.y);

      // Draw a small circle at each waypoint
      this.ctx.fillStyle =
        i === unit.currentWaypoint
          ? "rgba(255, 165, 0, 0.7)"
          : "rgba(255, 255, 0, 0.5)";
      this.ctx.fillRect(waypointPos.x - 2, waypointPos.y - 2, 4, 4);
    }

    // Draw line to final target if different from last waypoint
    if (
      unit.targetX !== null &&
      unit.targetY !== null &&
      unit.path.length > 0
    ) {
      const lastWaypoint = unit.path[unit.path.length - 1];
      if (lastWaypoint.x !== unit.targetX || lastWaypoint.y !== unit.targetY) {
        const targetPos = this.mapToScreen(unit.targetX, unit.targetY);
        this.ctx.lineTo(targetPos.x, targetPos.y);

        // Draw a star or different shape at final target
        this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        this.ctx.fillRect(targetPos.x - 3, targetPos.y - 3, 6, 6);
      }
    }

    this.ctx.stroke();
    this.ctx.restore();
  }
}
