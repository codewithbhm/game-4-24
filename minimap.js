import { toIsometric, getTerrainColor } from "./utils.js";

export class Minimap {
  constructor(containerId, config) {
    this.config = config; // { mapSize, tileWidth, tileHeight }
    this.minimapContainer = document.getElementById(containerId);
    if (!this.minimapContainer) {
      console.error(`Minimap container with id '${containerId}' not found.`);
      return;
    }
    this.minimapCanvas = document.createElement("canvas");
    this.minimapCtx = this.minimapCanvas.getContext("2d");
    this.minimapContainer.appendChild(this.minimapCanvas);
    this.resize(); // Initial size
  }

  resize() {
    if (!this.minimapContainer || !this.minimapCanvas) return;
    this.minimapCanvas.width = this.minimapContainer.clientWidth;
    this.minimapCanvas.height = this.minimapContainer.clientHeight;
  }

  render(mapData, cameraX, cameraY, scale, mainCanvasWidth, mainCanvasHeight) {
    if (!this.minimapCtx || !this.minimapCanvas) return;

    this.minimapCtx.clearRect(
      0,
      0,
      this.minimapCanvas.width,
      this.minimapCanvas.height
    );

    const mapIsoWidth = this.config.mapSize * this.config.tileWidth;
    const mapIsoHeight = this.config.mapSize * this.config.tileHeight;

    const scaleX = this.minimapCanvas.width / mapIsoWidth;
    const scaleY = this.minimapCanvas.height / mapIsoHeight;
    const minimapScale = Math.min(scaleX, scaleY);

    const isoMapCenterY = mapIsoHeight / 2;
    const translateX = this.minimapCanvas.width / 2;
    const translateY =
      this.minimapCanvas.height / 2 - isoMapCenterY * minimapScale;

    this.minimapCtx.save();
    this.minimapCtx.translate(translateX, translateY);
    this.minimapCtx.scale(minimapScale, minimapScale);

    // Draw map tiles
    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        const iso = toIsometric(
          x,
          y,
          this.config.tileWidth,
          this.config.tileHeight
        );
        const tileType = mapData[y][x];

        this.minimapCtx.beginPath();
        this.minimapCtx.moveTo(iso.x, iso.y);
        this.minimapCtx.lineTo(
          iso.x + this.config.tileWidth / 2,
          iso.y + this.config.tileHeight / 2
        );
        this.minimapCtx.lineTo(iso.x, iso.y + this.config.tileHeight);
        this.minimapCtx.lineTo(
          iso.x - this.config.tileWidth / 2,
          iso.y + this.config.tileHeight / 2
        );
        this.minimapCtx.closePath();

        this.minimapCtx.fillStyle = getTerrainColor(tileType);
        this.minimapCtx.fill();
      }
    }

    // Draw viewport indicator
    const viewportWidth = mainCanvasWidth / scale;
    const viewportHeight = mainCanvasHeight / scale;
    // Center of the viewport in the isometric world space (relative to map origin 0,0)
    // Adjusting for the main canvas's render offset (canvas.width/2, canvas.height/3)
    // We need to find the isometric world coordinates corresponding to the top-left of the *camera view*, not just the cameraX/Y offset.
    // The center of the screen (canvas.width/2, canvas.height/3) corresponds to iso coordinates (-cameraX/scale, -cameraY/scale)
    const viewCenterX = -cameraX / scale;
    const viewCenterY = -cameraY / scale;

    this.minimapCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    this.minimapCtx.lineWidth = 2 / minimapScale; // Keep line width visually consistent

    // Draw the rectangle centered around the view center
    this.minimapCtx.strokeRect(
      viewCenterX - viewportWidth / 2,
      viewCenterY - viewportHeight / 2,
      viewportWidth,
      viewportHeight
    );

    this.minimapCtx.restore();
  }
}
