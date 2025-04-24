import { toIsometric, getTerrainColor } from "./utils.js";

export class Renderer {
  constructor(ctx, canvas, tileWidth, tileHeight, trees) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.trees = trees; // Preloaded tree images
  }

  render(cameraX, cameraY, scale, mapData, treeData, hoveredTile, fps) {
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
          hoveredTile
        );
      }
    }

    // Draw trees in isometric order
    const sortedTrees = [...treeData].sort((a, b) => a.x + a.y - (b.x + b.y));
    sortedTrees.forEach((tree) => {
      this.drawTree(tree.x, tree.y, tree.type, cameraX, cameraY, scale);
    });

    // Render FPS and Zoom
    this.renderFPS(fps, scale);
  }

  drawTile(x, y, type, cameraX, cameraY, scale, hoveredTile) {
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

    // Highlight hovered tile
    if (hoveredTile && hoveredTile.x === x && hoveredTile.y === y) {
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
}
