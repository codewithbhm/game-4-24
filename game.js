import { MapGenerator } from "./mapGenerator.js";
import { Renderer } from "./renderer.js";
import { CameraControls } from "./cameraControls.js";
import { Minimap } from "./minimap.js";
import { toIsometric } from "./utils.js"; // isTileBuildable now handled by StateManager
import { AssetLoader } from "./assetLoader.js";
import { UIManager } from "./uiManager.js";
import { StateManager } from "./stateManager.js"; // <-- Import StateManager
import { EventHandler } from "./eventHandler.js"; // <-- Import EventHandler

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
      buildTimes: {
        house: 30000,
        barrack: 60000,
      },
      unitSpeed: 0.05, // Moved speed config here
    };

    // --- State (Now handled by StateManager) ---
    // REMOVED: this.mapData = [];
    // REMOVED: this.treeData = [];
    // REMOVED: this.buildings = [];
    // REMOVED: this.units = [];
    // REMOVED: this.constructions = [];
    // REMOVED: this.selectedBuilding = null;
    // REMOVED: this.selectedUnit = null;
    // REMOVED: this.selectedBuildingType = null;
    // REMOVED: this.hoveredTile = null;

    // --- FPS Counter State ---
    this.fps = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.lastFpsUpdate = 0;

    // --- Assets ---
    this.trees = null;
    this.buildingAssets = null;
    this.unitAssets = null;

    // --- Modules ---
    this.mapGenerator = new MapGenerator(this.config.mapSize); // Pass config mapSize
    this.renderer = null; // Init after assets
    this.cameraControls = new CameraControls(this.canvas, this.config); // Pass full config
    this.minimap = new Minimap("minimap", this.config); // Pass full config
    this.assetLoader = new AssetLoader();
    this.uiManager = new UIManager();
    // Pass mapSize and mapGenerator needed for initialization
    this.stateManager = new StateManager(
      this.config.mapSize,
      this.mapGenerator
    ); // <-- Instantiate StateManager
    // EventHandler needs access to other modules
    this.eventHandler = new EventHandler(
      this.canvas,
      this, // Pass game instance for callbacks/access to config, assets, mapToScreen
      this.stateManager,
      this.uiManager,
      this.cameraControls
    );

    // --- Start Loading ---
    this.assetLoader
      .loadAssets()
      .then((loadedAssets) => {
        this.trees = loadedAssets.trees;
        this.buildingAssets = loadedAssets.buildingAssets;
        this.unitAssets = loadedAssets.unitAssets;
        console.log("Game: Assets assigned.");

        // Initialize state *after* assets are loaded (though not strictly necessary here)
        this.stateManager.initializeState();
        console.log("Game: State initialized.");

        this.initGameModules(); // Init other modules that might depend on assets/state
        this.startGameLoop();
      })
      .catch((error) => {
        console.error("Failed to load assets or initialize game:", error);
        // Handle critical error - maybe show a message via UIManager
        this.uiManager.showTemporaryMessage("Error loading game assets!", 5000);
      });
  }

  // Helper to convert map coordinates to screen coordinates
  mapToScreen(mapX, mapY) {
    const iso = toIsometric(
      mapX,
      mapY,
      this.config.tileWidth,
      this.config.tileHeight
    );
    const scaledCameraX = this.config.cameraX;
    const scaledCameraY = this.config.cameraY;
    const offsetX = this.canvas.width / 2 + scaledCameraX;
    const offsetY = this.canvas.height / 3 + scaledCameraY;
    const scale = this.config.scale;
    const tileTopX = offsetX + iso.x * scale;
    const tileTopY = offsetY + iso.y * scale;
    return { x: tileTopX, y: tileTopY };
  }

  // Initialize modules that depend on loaded assets or initial state
  initGameModules() {
    // Check required assets are available (redundant check, loader should handle)
    if (
      !this.trees ||
      !this.buildingAssets ||
      !this.unitAssets ||
      !this.buildingAssets.house ||
      !this.buildingAssets.barrack ||
      !this.buildingAssets.town_center
    ) {
      console.error(
        "Game: Required assets not available for module initialization."
      );
      return;
    }

    // Initialize Renderer with assets
    this.renderer = new Renderer(
      this.ctx,
      this.canvas,
      this.config.tileWidth,
      this.config.tileHeight,
      this.trees,
      this.buildingAssets,
      this.unitAssets
    );
    console.log("Game: Renderer initialized.");

    // Set initial canvas size and listener
    this.resizeCanvas();
    // --- Register event listeners via EventHandler ---
    this.eventHandler.registerEvents();
    // --- REMOVED direct event listener setup ---
    // window.addEventListener('resize', ...);
    // this.canvas.addEventListener('click', ...);
    // window.addEventListener('keydown', ...);
    console.log("Game: Event listeners registered via EventHandler.");

    // Initialize UI Manager (passing Game instance for callbacks)
    this.uiManager.init(this);
    console.log("Game: UIManager initialized.");
  }

  // REMOVED old initGame, replaced by initializeState and initGameModules

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - 150;
    this.minimap.resize();
    // Re-render immediately only if renderer is ready
    if (this.renderer) {
      const currentState = this.stateManager.getState();
      this.render(
        this.stateManager.isTileBuildable(
          currentState.hoveredTile?.x,
          currentState.hoveredTile?.y
        )
      );
    }
  }

  updateFPS() {
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFpsUpdate > 500) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    this.lastTime = now;
  }

  // --- Delegated Methods to StateManager ---
  selectBuildingToBuild(type) {
    this.stateManager.setSelectedBuildingType(type);
    // Update UI based on new state
    const controlState = this.cameraControls.state;
    const gameState = this.stateManager.getState();
    this.uiManager.updateBuildUI(
      gameState.selectedBuildingType,
      controlState.isDragging
    );
    // Update action panels if selection changed
    this.uiManager.updateBuildingActionsPanel(gameState.selectedBuilding, this);
    this.uiManager.updateUnitActionsPanel(gameState.selectedUnit);
  }

  queueUnitTraining(building, unitType, trainTime) {
    if (!building) return;
    // Delegate to StateManager
    this.stateManager.addTrainingItem(
      building.x,
      building.y,
      unitType,
      trainTime
    );
    // Optionally provide UI feedback via UIManager
    // this.uiManager.showTemporaryMessage(`${unitType} training started.`);
  }

  // --- Game Loop ---
  gameLoop() {
    // Get state needed for updates/rendering
    const controlState = this.cameraControls.state;
    const gameState = this.stateManager.getState(); // Get current state snapshot

    // Update hovered tile in state
    this.stateManager.setHoveredTile(controlState.hoveredTile);

    // Update UI (Cursor)
    this.uiManager.updateBuildUI(
      gameState.selectedBuildingType,
      controlState.isDragging
    );

    // Update Game Logic
    this.cameraControls.updateMovement(); // Updates config.cameraX/Y
    this.updateFPS();

    // Delegate state updates to StateManager
    this.stateManager.updateConstructions();
    this.stateManager.updateTrainingQueue();
    this.stateManager.updateUnits(this.config.unitSpeed); // Pass speed from config

    // Re-fetch state after updates for rendering
    const updatedGameState = this.stateManager.getState();

    // Determine buildability for render overlay
    const canBuildOnHovered = this.stateManager.isTileBuildable(
      updatedGameState.hoveredTile?.x,
      updatedGameState.hoveredTile?.y
    );

    // Render all components
    this.render(canBuildOnHovered, updatedGameState); // Pass state to render
    this.minimap.render(
      updatedGameState.mapData, // Use state data
      this.config.cameraX,
      this.config.cameraY,
      this.config.scale,
      this.canvas.width,
      this.canvas.height
    );

    requestAnimationFrame(() => this.gameLoop());
  }

  startGameLoop() {
    // Ensure renderer is ready before starting the loop
    if (!this.renderer) {
      console.warn("Game: Renderer not ready, delaying game loop start.");
      setTimeout(() => this.startGameLoop(), 100);
      return;
    }
    console.log("Game: Starting main loop.");
    requestAnimationFrame(() => this.gameLoop());
  }

  // Render method now takes gameState
  render(canBuildOnHovered, gameState) {
    if (!this.renderer || !gameState) return;
    this.renderer.render(
      this.config.cameraX,
      this.config.cameraY,
      this.config.scale,
      gameState.mapData,
      gameState.treeData,
      gameState.hoveredTile, // Get from gameState
      this.fps,
      gameState.selectedBuildingType, // Get from gameState
      gameState.buildings, // Get from gameState
      canBuildOnHovered,
      gameState.constructions, // Get from gameState
      gameState.selectedBuilding, // Get from gameState
      gameState.selectedUnit, // Get from gameState
      gameState.units // Get from gameState
    );
  }

  // REMOVED: updateConstructions (moved to StateManager)
  // REMOVED: canHoveredTileBeBuiltOn (use stateManager.isTileBuildable)

  // --- Event Handlers are now in EventHandler.js ---
  // REMOVED: handleKeyDown(event)
  // REMOVED: handleMapClick(event)
}

// --- Global Init --- Should ideally be managed better
window.onload = () => {
  // Setup error handling or loading indicator here?
  console.log("Window loaded, creating game instance...");
  try {
    new IsometricGame();
  } catch (error) {
    console.error("CRITICAL ERROR during game initialization:", error);
    // Display a user-friendly error message on the page
    document.body.innerHTML =
      '<div style="color: red; padding: 20px;">Failed to initialize the game. Please check the console for details.</div>';
  }
};
