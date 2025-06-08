# Isometric Game 4-24

An isometric game engine built with JavaScript that implements a real-time strategy (RTS) game system with building construction, unit management, and resource gathering mechanics.

## 🎮 Game Overview

This is an isometric-view game engine that implements core RTS (Real-Time Strategy) game mechanics. The game features:

- Isometric map rendering with terrain and trees
- Building construction system
- Unit management and pathfinding
- Resource gathering and management
- Training new units from buildings
- Camera controls with zoom and pan

## 🏗️ Core Game Systems

### Buildings and Construction

- Players can construct different types of buildings:
  - Town Center: Main building that can train villagers
  - Houses: Basic residential buildings
  - Barracks: Military structures

### Units and Controls

- Unit Types:
  - Villagers: Basic worker units that can construct buildings
- Units can be:
  - Selected and controlled
  - Commanded to move to locations
  - Assigned to construction tasks

### Game State Management

The game uses a robust state management system that handles:
- Map data and terrain
- Building placement and construction
- Unit movement and pathfinding
- Resource management
- Selection system for buildings and units

## 🎯 Key Features

1. **Isometric Rendering**
   - Smooth isometric graphics rendering
   - Dynamic tile-based map system
   - Tree and obstacle placement

2. **Camera Controls**
   - Zoom in/out functionality
   - Pan camera across the map
   - Minimap navigation

3. **Building System**
   - Building placement validation
   - Construction progress tracking
   - Multiple building types

4. **Unit Management**
   - Unit training system
   - Pathfinding for unit movement
   - Unit task assignment

5. **User Interface**
   - Building selection menu
   - Action panels for selected units/buildings
   - Construction progress indicators
   - FPS counter

## 🔧 Technical Architecture

The game is built with a modular architecture consisting of several key components:

- `IsometricGame`: Main game class coordinating all systems
- `StateManager`: Handles game state and logic
- `Renderer`: Manages all game rendering
- `UIManager`: Handles user interface elements
- `EventHandler`: Manages user input and events
- `CameraControls`: Handles camera movement and zoom
- `Pathfinder`: Implements unit pathfinding
- `MapGenerator`: Generates the game map

## 🎥 Demo

This game was created as part of a YouTube tutorial. You can watch the development process here:
[YouTube Tutorial](https://www.youtube.com/live/DM8u2zWuZK8)

## 🚀 Running the Game

1. Clone the repository
2. Host the files using a local web server
3. Open the game in a modern web browser
4. Start building and managing your settlement!

## 🛠️ Technologies

- Pure JavaScript (ES6+)
- HTML5 Canvas for rendering
- CSS for UI styling
- No external dependencies required

## 👨‍💻 Development

This project uses a modular JavaScript architecture with separate concerns for:
- Game state management
- Rendering
- User input handling
- UI management
- Asset loading

## 🎮 Controls

- Left Click: Select units/buildings
- Right Click: Move selected units
- Mouse Wheel: Zoom in/out
- Arrow Keys/WASD: Pan camera
- Building Buttons: Select building type to construct

## 🔄 Game Loop

The game implements a standard game loop that:
1. Updates game state
2. Handles user input
3. Updates unit positions
4. Processes construction/training queues
5. Renders the current frame

## 📝 Contributing

Feel free to contribute to this project by:
1. Forking the repository
2. Creating a feature branch
3. Submitting a pull request

## 🎨 Credits

Created by [SelmanKahya](https://github.com/SelmanKahya) as part of a YouTube tutorial series.

## 📄 License

This project is open source and available under the MIT License.
