# Game-4-24 Technical Documentation
> An Isometric RTS Game Engine Implementation

## 📚 Technical Overview

This is a JavaScript-based isometric game engine implementing RTS (Real-Time Strategy) mechanics. Built using vanilla JavaScript and HTML5 Canvas, it demonstrates advanced game development patterns and real-time state management.

## 🏗️ Architecture

### Core Systems Architecture

```javascript
// Main Game Class Structure
class IsometricGame {
    constructor() {
        // Core Systems
        this.stateManager = new StateManager(this.config.mapSize, this.mapGenerator);
        this.renderer = null;
        this.cameraControls = new CameraControls(this.canvas, this.config);
        this.minimap = new Minimap("minimap", this.config);
        this.assetLoader = new AssetLoader();
        this.uiManager = new UIManager();
        this.eventHandler = new EventHandler(
            this.canvas,
            this,
            this.stateManager,
            this.uiManager,
            this.cameraControls
        );
    }
}
```

### State Management System

```javascript
// State Manager Implementation
class StateManager {
    constructor(mapSize, mapGenerator) {
        // Core Game State
        this.mapData = [];
        this.treeData = [];
        this.buildings = [];      // { x, y, type }
        this.units = [];          // { x, y, type, targetX, targetY, path, currentWaypoint }
        this.constructions = [];   // { x, y, type, startTime, buildTime, progress, builderId }
        this.trainingQueue = [];   // { buildingX, buildingY, unitType, startTime, trainTime, progress }
        
        // Selection State
        this.selectedBuilding = null;
        this.selectedUnit = null;
        this.selectedBuildingType = null;
    }
}
```

## 🔧 Core Systems

### 1. Game Configuration

```javascript
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
    unitSpeed: 0.05
};
```

### 2. Construction System

```javascript
// Building Construction Management
updateConstructions() {
    const now = performance.now();
    const completedConstructions = [];
    
    this.constructions = this.constructions.filter((construction) => {
        const builder = this.findBuilderForConstruction(construction);
        const builderPresent = builder !== null;
        
        if (builderPresent) {
            construction.builderId = builder.id;
            construction.totalElapsedTime += timeSinceUpdate;
            
            if (construction.totalElapsedTime >= construction.buildTime) {
                completedConstructions.push({
                    x: construction.x,
                    y: construction.y,
                    type: construction.type
                });
                return false;
            }
            construction.progress = construction.totalElapsedTime / construction.buildTime;
        }
        return true;
    });
}
```

### 3. Unit Management System

```javascript
// Unit Movement and Pathfinding
commandUnitMove(unit, targetX, targetY) {
    if (!unit) return;
    
    // Handle construction interruption
    const construction = this.constructions.find(c => c.builderId === unit.id);
    if (construction) {
        construction.isPaused = true;
        construction.builderId = null;
    }
    
    // Pathfinding implementation
    const path = this.pathfinder.findPath(
        Math.floor(unit.x),
        Math.floor(unit.y),
        targetX,
        targetY
    );
    
    if (path && path.length > 0) {
        unit.path = path;
        unit.currentWaypoint = 0;
        unit.targetX = targetX;
        unit.targetY = targetY;
    }
}
```

### 4. UI Management System

```javascript
class UIManager {
    constructor() {
        this.buildHouseButton = document.getElementById("build-house-button");
        this.buildBarrackButton = document.getElementById("build-barrack-button");
        this.cancelBuildButton = document.getElementById("cancel-build-button");
        this.buildingActionsContainer = document.getElementById("buildingActions");
        this.canvas = document.getElementById("gameCanvas");
    }
    
    updateBuildUI(selectedBuildingType, isDragging) {
        if (!this.canvas) return;
        
        // Reset button states
        if (this.buildHouseButton) this.buildHouseButton.classList.remove("active");
        if (this.buildBarrackButton) this.buildBarrackButton.classList.remove("active");
        
        // Update UI based on selection
        if (selectedBuildingType === "house" && this.buildHouseButton) {
            this.buildHouseButton.classList.add("active");
            this.canvas.style.cursor = "copy";
        }
    }
}
```

## 🎮 Game Loop Implementation

```javascript
gameLoop() {
    // Get current state
    const controlState = this.cameraControls.state;
    const gameState = this.stateManager.getState();

    // Update game state
    this.stateManager.setHoveredTile(controlState.hoveredTile);
    this.uiManager.updateBuildUI(gameState.selectedBuildingType, controlState.isDragging);
    
    // Update game logic
    this.cameraControls.updateMovement();
    this.updateFPS();
    this.stateManager.updateConstructions();
    this.stateManager.updateTrainingQueue();
    this.stateManager.updateUnits(this.config.unitSpeed);
    
    // Render
    const updatedGameState = this.stateManager.getState();
    this.render(canBuildOnHovered, updatedGameState);
    
    // Continue loop
    requestAnimationFrame(() => this.gameLoop());
}
```

## 🗺️ Map Generation System

```javascript
class MapGenerator {
    generateMap() {
        // Generate terrain
        const map = Array(this.mapSize).fill().map(() => 
            Array(this.mapSize).fill().map(() => ({
                type: 'grass',
                height: 0
            }))
        );
        return map;
    }
    
    generateTrees() {
        // Generate obstacles and resources
        const trees = [];
        // Tree placement logic
        return trees;
    }
}
```

## 🎯 Event Handling System

```javascript
class EventHandler {
    registerEvents() {
        // Mouse events
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
}
```

## 📦 Asset Management

Assets are loaded through the AssetLoader class:
```javascript
class AssetLoader {
    async loadAssets() {
        return {
            trees: await this.loadImage('trees.png'),
            buildingAssets: {
                house: await this.loadImage('house.png'),
                barrack: await this.loadImage('barrack.png'),
                town_center: await this.loadImage('town_center.png')
            },
            unitAssets: {
                villager: await this.loadImage('villager.png')
            }
        };
    }
}
```

## 🔄 State Update Cycle

1. Game Loop Initialization
2. State Updates
3. User Input Processing
4. Physics/Movement Updates
5. Construction/Training Updates
6. Rendering
7. Loop Continuation

## 🛠️ Development Setup

1. Clone the repository:
```bash
git clone https://github.com/SelmanKahya/game-4-24.git
```

2. Set up a local development server (e.g., using Python):
```bash
python -m http.server 8000
```

3. Open in browser:
```
http://localhost:8000
```

## 📝 Implementation Notes

- Uses vanilla JavaScript for better performance
- Implements entity-component system for game objects
- Uses requestAnimationFrame for smooth animation
- Implements isometric projection for 2.5D view
- Uses HTML5 Canvas for rendering
- Implements A* pathfinding for unit movement

## 🎥 Development Tutorial

This game was developed as part of a tutorial series. Watch the development process:
[Development Tutorial](https://www.youtube.com/live/DM8u2zWuZK8)

## 🔍 Debug Tools

```javascript
showTemporaryMessage(message, duration = 1500) {
    let messageElement = document.getElementById("game-message");
    if (!messageElement) {
        messageElement = document.createElement("div");
        messageElement.id = "game-message";
        // ... styling setup ...
    }
    messageElement.textContent = message;
    messageElement.style.display = "block";
    setTimeout(() => {
        messageElement.style.display = "none";
    }, duration);
}
```

## 📈 Performance Considerations

- Uses efficient state management to minimize updates
- Implements object pooling for frequently created/destroyed objects
- Uses spatial partitioning for collision detection
- Optimizes render cycles with dirty checking

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Implement your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.
