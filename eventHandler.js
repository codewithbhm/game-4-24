export class EventHandler {
  constructor(canvas, game, stateManager, uiManager, cameraControls) {
    this.canvas = canvas;
    this.game = game; // For mapToScreen, config, assets
    this.stateManager = stateManager;
    this.uiManager = uiManager;
    this.cameraControls = cameraControls;

    // Bind methods to ensure 'this' context is correct
    this.handleMapClick = this.handleMapClick.bind(this);
    this.handleMapRightClick = this.handleMapRightClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }

  registerEvents() {
    this.canvas.addEventListener("click", this.handleMapClick);
    this.canvas.addEventListener("contextmenu", this.handleMapRightClick);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("resize", this.handleResize);
    console.log("EventHandler: Events registered.");
  }

  unregisterEvents() {
    this.canvas.removeEventListener("click", this.handleMapClick);
    this.canvas.removeEventListener("contextmenu", this.handleMapRightClick);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("resize", this.handleResize);
    console.log("EventHandler: Events unregistered.");
  }

  handleKeyDown(event) {
    if (event.key === "Escape") {
      const currentState = this.stateManager.getState();
      const wasInBuildMode = currentState.selectedBuildingType !== null;
      const wasObjectSelected =
        currentState.selectedBuilding !== null ||
        currentState.selectedUnit !== null;

      // Clear selections in state manager
      this.stateManager.clearSelections();

      // Update UI based on cleared state
      const finalState = this.stateManager.getState();
      const controlState = this.cameraControls.state; // Get current drag state
      this.uiManager.updateBuildUI(
        finalState.selectedBuildingType,
        controlState.isDragging
      );
      this.uiManager.updateBuildingActionsPanel(
        finalState.selectedBuilding,
        this.game
      ); // Pass game for callbacks
      this.uiManager.updateUnitActionsPanel(finalState.selectedUnit);

      if (wasInBuildMode || wasObjectSelected) {
        console.log("EventHandler (Escape): Selections cleared.");
      }
    }
    // Handle other keys if needed (e.g., camera movement, shortcuts)
  }

  handleResize() {
    // Delegate resizing logic to the game/relevant modules
    this.game.resizeCanvas();
  }

  handleMapClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    let foundTarget = null; // Store the found building or unit
    const currentState = this.stateManager.getState();
    const config = this.game.config; // Access config from game
    const buildingAssets = this.game.buildingAssets; // Access assets from game
    const unitAssets = this.game.unitAssets; // Access assets from game

    // --- 1. Check for building selection ---
    if (buildingAssets) {
      for (let i = currentState.buildings.length - 1; i >= 0; i--) {
        const building = currentState.buildings[i];
        const asset = buildingAssets[building.type];
        if (!asset) continue;

        // Calculate screen bounds using game.mapToScreen
        const bounds = this.calculateScreenBounds(
          building.x,
          building.y,
          config,
          asset,
          0.7,
          1.2
        );

        if (this.isClickInside(clickX, clickY, bounds)) {
          console.log("EventHandler: Click HIT building!", building);
          foundTarget = { type: "building", data: building };
          break;
        }
      }
    }

    // --- 2. Check for unit selection (only if no building was hit) ---
    if (!foundTarget && unitAssets) {
      for (let i = currentState.units.length - 1; i >= 0; i--) {
        const unit = currentState.units[i];
        const asset = unitAssets[unit.type];
        if (!asset) continue;

        // Calculate screen bounds (adjust size factors as needed)
        const bounds = this.calculateScreenBounds(
          unit.x,
          unit.y,
          config,
          asset,
          0.5,
          1.0
        );

        if (this.isClickInside(clickX, clickY, bounds)) {
          console.log("EventHandler: Click HIT unit!", unit);
          foundTarget = { type: "unit", data: unit };
          break;
        }
      }
    }

    // --- 3. Process Click Result ---
    if (foundTarget) {
      // Select the found target
      if (foundTarget.type === "building") {
        this.stateManager.setSelectedBuilding(foundTarget.data);
      } else {
        // unit
        this.stateManager.setSelectedUnit(foundTarget.data);
      }
      this.stateManager.setSelectedBuildingType(null); // Exit build mode on selection
    } else {
      // Click Miss - Handle build placement or deselect
      console.log("EventHandler: Click miss.");
      const { selectedBuildingType, hoveredTile, selectedUnit } = currentState;
      let placedBuilding = false;

      // A) Check for build placement command
      if (selectedBuildingType && hoveredTile) {
        // Check buildability via StateManager
        if (this.stateManager.isTileBuildable(hoveredTile.x, hoveredTile.y)) {
          // Add construction via StateManager
          const buildTime = config.buildTimes[selectedBuildingType] || 30000;
          const construction = this.stateManager.addConstruction(
            hoveredTile.x,
            hoveredTile.y,
            selectedBuildingType,
            buildTime
          );
          placedBuilding = true;

          // Command selected villager (if any)
          if (selectedUnit && selectedUnit.type === "villager") {
            // Find an adjacent tile for the villager to stand on while building
            const adjacentTile = this.findAdjacentBuildTile(
              hoveredTile.x,
              hoveredTile.y
            );
            if (adjacentTile) {
              // Command villager to move to the location and then build
              this.stateManager.commandUnitMove(
                selectedUnit,
                adjacentTile.x,
                adjacentTile.y
              );
              // Set the build target so the villager starts building when it arrives
              selectedUnit.buildTargetX = hoveredTile.x;
              selectedUnit.buildTargetY = hoveredTile.y;
              console.log(
                `EventHandler: Villager commanded to move to adjacent tile (${adjacentTile.x}, ${adjacentTile.y}) for building at (${hoveredTile.x}, ${hoveredTile.y})`
              );
            } else {
              console.log(
                `EventHandler: No adjacent tile found, cannot build at (${hoveredTile.x}, ${hoveredTile.y})`
              );
              this.uiManager.showTemporaryMessage("No space for builder");
              return; // Exit if no adjacent tile is available
            }
          }

          // Optional: Exit build mode
          // this.stateManager.setSelectedBuildingType(null);
        } else {
          console.log("EventHandler: Cannot build here.");
          this.uiManager.showTemporaryMessage("Cannot build here");
        }
      }

      // B) Deselect if click was a miss AND didn't place a building
      if (
        !placedBuilding &&
        (currentState.selectedBuilding || currentState.selectedUnit)
      ) {
        console.log("EventHandler: Deselecting on click miss.");
        this.stateManager.clearSelections();
      }
    }

    // --- 4. Update UI based on final state ---
    const finalState = this.stateManager.getState();
    const controlState = this.cameraControls.state; // Get current drag state
    this.uiManager.updateBuildUI(
      finalState.selectedBuildingType,
      controlState.isDragging
    );
    this.uiManager.updateBuildingActionsPanel(
      finalState.selectedBuilding,
      this.game
    ); // Pass game
    this.uiManager.updateUnitActionsPanel(finalState.selectedUnit);

    // --- 5. Re-render is handled by the game loop, no direct call here needed ---
    // Although, for immediate feedback on click, a direct render *could* be triggered,
    // but it might be redundant with the game loop's render.
    // Let's rely on the game loop for now.
  }

  handleMapRightClick(event) {
    // Prevent default context menu
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const currentState = this.stateManager.getState();
    const config = this.game.config;
    const buildingAssets = this.game.buildingAssets;

    // Only process right-clicks if a villager is selected
    if (
      !currentState.selectedUnit ||
      currentState.selectedUnit.type !== "villager"
    ) {
      return;
    }

    // Get the selected villager
    const villager = currentState.selectedUnit;

    // First, check if clicking on a construction site
    let targetConstruction = null;

    // Check through constructions
    for (let i = 0; i < currentState.constructions.length; i++) {
      const construction = currentState.constructions[i];
      // Use the same bounds calculation as for buildings
      const asset = buildingAssets[construction.type];
      if (!asset) continue;

      const bounds = this.calculateScreenBounds(
        construction.x,
        construction.y,
        config,
        asset,
        0.7,
        1.2
      );

      if (this.isClickInside(clickX, clickY, bounds)) {
        targetConstruction = construction;
        break;
      }
    }

    if (targetConstruction) {
      // Found a construction site to work on
      console.log(
        "EventHandler: Right-clicked on construction site to build",
        targetConstruction
      );
      this.stateManager.commandUnitBuild(
        villager,
        targetConstruction.x,
        targetConstruction.y
      );
    } else {
      // Normal move command
      // Convert screen coordinates to map coordinates
      const mapCoords = this.screenToMap(clickX, clickY);
      if (mapCoords) {
        this.stateManager.commandUnitMove(villager, mapCoords.x, mapCoords.y);
        console.log(
          `EventHandler: Right-click move command to (${mapCoords.x}, ${mapCoords.y})`
        );
      }
    }
  }

  // Helper to convert screen coordinates to map coordinates
  screenToMap(screenX, screenY) {
    // Use the cameraControls.screenToTile method instead of our own implementation
    return this.cameraControls.screenToTile(screenX, screenY);
  }

  // Helper to calculate screen bounds based on map coords and object size factors
  calculateScreenBounds(mapX, mapY, config, asset, widthFactor, heightFactor) {
    const tileTopPos = this.game.mapToScreen(mapX, mapY); // Use game's helper
    const renderWidth = config.tileWidth * widthFactor;
    const renderHeight = config.tileHeight * heightFactor; // Might use asset.height later if needed
    const scaledWidth = renderWidth * config.scale;
    const scaledHeight = renderHeight * config.scale;

    // Base Y is the center of the tile's diamond top edge + half tile height (visual floor level)
    const baseVisualY = tileTopPos.y + (config.tileHeight / 2) * config.scale;

    // X is centered on the tile's top point
    const screenX = tileTopPos.x - scaledWidth / 2;

    // Y is calculated up from the visual base
    const screenY = baseVisualY - scaledHeight;

    return {
      left: screenX,
      right: screenX + scaledWidth,
      top: screenY,
      bottom: baseVisualY, // Bottom aligns with the visual floor of the tile
    };
  }

  // Helper to check if click is within bounds
  isClickInside(clickX, clickY, bounds) {
    return (
      clickX >= bounds.left &&
      clickX <= bounds.right &&
      clickY >= bounds.top &&
      clickY <= bounds.bottom
    );
  }

  // Helper to find an adjacent buildable tile for the villager to stand on
  findAdjacentBuildTile(buildX, buildY) {
    // Check the immediate adjacent tiles (4 directions)
    const directions = [
      { dx: 0, dy: -1 }, // North
      { dx: 1, dy: 0 }, // East
      { dx: 0, dy: 1 }, // South
      { dx: -1, dy: 0 }, // West
      // Adding diagonals for more options
      { dx: 1, dy: -1 }, // Northeast
      { dx: 1, dy: 1 }, // Southeast
      { dx: -1, dy: 1 }, // Southwest
      { dx: -1, dy: -1 }, // Northwest
    ];

    for (const dir of directions) {
      const x = buildX + dir.dx;
      const y = buildY + dir.dy;

      if (this.stateManager.isTileBuildable(x, y)) {
        return { x, y };
      }
    }

    return null; // No adjacent buildable tile found
  }
}
