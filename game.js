import { MapGenerator } from "./mapGenerator.js";
import { Renderer } from "./renderer.js";
import { CameraControls } from "./cameraControls.js";
import { Minimap } from "./minimap.js";
// Note: utils.js functions are used internally by other modules, no direct import needed here usually.

class IsometricGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // --- Configuration ---
    this.config = {
      tileWidth: 64,
      tileHeight: 32,
      mapSize: 50,
      cameraX: 0,
      cameraY: 0,
      scale: 0.75,
      minScale: 0.2,
      maxScale: 2.0,
      zoomSpeed: 0.3,
      acceleration: 2,
      maxSpeed: 20,
      friction: 0.92,
    };

    // --- State ---
    this.mapData = [];
    this.treeData = [];
    this.trees = {}; // Image objects
    this.fps = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.hoveredTile = null; // Will be managed by CameraControls

    // --- Modules ---
    this.mapGenerator = new MapGenerator(this.config.mapSize);
    this.renderer = null; // Initialize after images load
    this.cameraControls = new CameraControls(this.canvas, this.config); // Pass config object
    this.minimap = new Minimap("minimap", this.config); // Pass config object

    this.loadAssets().then(() => {
      this.initGame();
      this.startGameLoop();
    });
  }

  async loadAssets() {
    const treeTypes = ["pine", "palm", "willow"];
    const promises = treeTypes.map((type) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.trees[type] = img;
          resolve();
        };
        img.onerror = reject;
        img.src = `assets/${type}-tree.svg`;
      });
    });
    await Promise.all(promises);
    console.log("Assets loaded");
  }

  initGame() {
    // Generate map and trees
    this.mapData = this.mapGenerator.generateMap();
    this.treeData = this.mapGenerator.generateTrees(this.mapData);

    // Initialize Renderer now that images are loaded
    this.renderer = new Renderer(
      this.ctx,
      this.canvas,
      this.config.tileWidth,
      this.config.tileHeight,
      this.trees
    );

    // Initial setup
    this.resizeCanvas(); // Set initial canvas size
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - 150; // Subtract control panel height

    // Resize minimap canvas as well
    this.minimap.resize();

    // Re-render after resize
    if (this.renderer) {
      this.render();
    }
  }

  updateFPS() {
    const now = performance.now();
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

  gameLoop() {
    // Get current state from controls
    const controlState = this.cameraControls.state;
    this.hoveredTile = controlState.hoveredTile; // Update main game state if needed elsewhere

    // Update logic
    this.cameraControls.updateMovement(); // Updates cameraX/Y in this.config
    this.updateFPS();

    // Render all components
    this.render();
    this.minimap.render(
      this.mapData,
      this.config.cameraX,
      this.config.cameraY,
      this.config.scale,
      this.canvas.width,
      this.canvas.height
    );

    requestAnimationFrame(() => this.gameLoop()); // Arrow function to maintain 'this' context
  }

  startGameLoop() {
    // Use an arrow function to ensure 'this' refers to the IsometricGame instance
    if (!this.renderer) {
      console.warn("Renderer not ready, delaying game loop start.");
      setTimeout(() => this.startGameLoop(), 100);
      return;
    }
    requestAnimationFrame(() => this.gameLoop());
  }

  render() {
    if (!this.renderer) return; // Don't render if renderer isn't initialized

    this.renderer.render(
      this.config.cameraX,
      this.config.cameraY,
      this.config.scale,
      this.mapData,
      this.treeData,
      this.cameraControls.state.hoveredTile, // Get hoveredTile directly from controls state
      this.fps
    );
  }
}

// Start the game when the window loads
window.onload = () => {
  new IsometricGame();
};
