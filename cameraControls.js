export class CameraControls {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config; // { cameraX, cameraY, scale, tileWidth, tileHeight, mapSize, minScale, maxScale, zoomSpeed, acceleration, maxSpeed, friction }
    this.keys = {};
    this.velocityX = 0;
    this.velocityY = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.hoveredTile = null;

    this.setupListeners();
  }

  get state() {
    return {
      cameraX: this.config.cameraX,
      cameraY: this.config.cameraY,
      scale: this.config.scale,
      hoveredTile: this.hoveredTile,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
    };
  }

  setupListeners() {
    document.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldWorldX =
        (mouseX - this.canvas.width / 2 - this.config.cameraX) /
        this.config.scale;
      const oldWorldY =
        (mouseY - this.canvas.height / 3 - this.config.cameraY) /
        this.config.scale;

      const zoomAmount =
        e.deltaY < 0 ? 1 + this.config.zoomSpeed : 1 - this.config.zoomSpeed;
      let newScale = this.config.scale * zoomAmount;
      this.config.scale = Math.max(
        this.config.minScale,
        Math.min(this.config.maxScale, newScale)
      );

      const newWorldX =
        (mouseX - this.canvas.width / 2 - this.config.cameraX) /
        this.config.scale;
      const newWorldY =
        (mouseY - this.canvas.height / 3 - this.config.cameraY) /
        this.config.scale;

      this.config.cameraX += (newWorldX - oldWorldX) * this.config.scale;
      this.config.cameraY += (newWorldY - oldWorldY) * this.config.scale;

      // Update hovered tile immediately after zoom
      this.updateHoveredTile(this.mouseX, this.mouseY);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.updateHoveredTile(this.mouseX, this.mouseY);
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredTile = null;
    });
  }

  updateHoveredTile(screenX, screenY) {
    this.hoveredTile = this.screenToTile(screenX, screenY);
  }

  updateMovement() {
    // Update velocities based on key states
    if (this.keys["ArrowLeft"]) {
      this.velocityX = Math.min(
        this.velocityX + this.config.acceleration,
        this.config.maxSpeed
      );
    }
    if (this.keys["ArrowRight"]) {
      this.velocityX = Math.max(
        this.velocityX - this.config.acceleration,
        -this.config.maxSpeed
      );
    }
    if (this.keys["ArrowUp"]) {
      this.velocityY = Math.min(
        this.velocityY + this.config.acceleration,
        this.config.maxSpeed
      );
    }
    if (this.keys["ArrowDown"]) {
      this.velocityY = Math.max(
        this.velocityY - this.config.acceleration,
        -this.config.maxSpeed
      );
    }

    // Apply friction
    if (!this.keys["ArrowLeft"] && !this.keys["ArrowRight"]) {
      this.velocityX *= this.config.friction;
    }
    if (!this.keys["ArrowUp"] && !this.keys["ArrowDown"]) {
      this.velocityY *= this.config.friction;
    }

    // Stop tiny movements
    if (Math.abs(this.velocityX) < 0.01) this.velocityX = 0;
    if (Math.abs(this.velocityY) < 0.01) this.velocityY = 0;

    // Update camera position in config
    this.config.cameraX += this.velocityX;
    this.config.cameraY += this.velocityY;
  }

  // Convert screen coordinates to tile coordinates
  screenToTile(screenX, screenY) {
    // Adjust for camera and canvas center offset
    const x =
      (screenX - this.canvas.width / 2 - this.config.cameraX) /
      this.config.scale;
    const y =
      (screenY - this.canvas.height / 3 - this.config.cameraY) /
      this.config.scale;

    // Convert to cartesian coordinates
    const tileX = Math.floor(
      x / this.config.tileWidth + y / this.config.tileHeight
    );
    const tileY = Math.floor(
      y / this.config.tileHeight - x / this.config.tileWidth
    );

    // Check if the tile is within bounds
    if (
      tileX >= 0 &&
      tileX < this.config.mapSize &&
      tileY >= 0 &&
      tileY < this.config.mapSize
    ) {
      return { x: tileX, y: tileY };
    }
    return null;
  }
}
