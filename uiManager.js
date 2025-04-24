export class UIManager {
  constructor() {
    this.buildHouseButton = document.getElementById("build-house-button");
    this.buildBarrackButton = document.getElementById("build-barrack-button");
    this.cancelBuildButton = document.getElementById("cancel-build-button");
    this.buildingActionsContainer = document.getElementById("buildingActions");
    this.canvas = document.getElementById("gameCanvas"); // Needed for cursor style

    if (!this.buildHouseButton) console.error("Build house button not found!");
    if (!this.buildBarrackButton)
      console.error("Build barrack button not found!");
    if (!this.cancelBuildButton)
      console.error("Cancel build button not found!");
    if (!this.buildingActionsContainer)
      console.error("Building actions container not found!");
    if (!this.canvas) console.error("Game canvas not found!");
  }

  init(game) {
    // Attach listeners that trigger game logic (passed in)
    if (this.buildHouseButton) {
      this.buildHouseButton.addEventListener("click", () =>
        game.selectBuildingToBuild("house")
      );
    }
    if (this.buildBarrackButton) {
      this.buildBarrackButton.addEventListener("click", () =>
        game.selectBuildingToBuild("barrack")
      );
    }
    if (this.cancelBuildButton) {
      this.cancelBuildButton.addEventListener("click", () =>
        game.selectBuildingToBuild(null)
      );
      this.cancelBuildButton.classList.add("hidden"); // Initially hide
    }

    // Initial state updates might be needed here or called from game.initGame
    this.updateBuildingActionsPanel(null, game); // Start empty
    this.updateUnitActionsPanel(null); // Start hidden
  }

  // Updates build buttons state, cancel button visibility, and cursor
  updateBuildUI(selectedBuildingType, isDragging) {
    if (!this.canvas) return;

    // Reset button states
    if (this.buildHouseButton) this.buildHouseButton.classList.remove("active");
    if (this.buildBarrackButton)
      this.buildBarrackButton.classList.remove("active");

    // Toggle cancel button visibility
    if (this.cancelBuildButton) {
      if (selectedBuildingType) {
        this.cancelBuildButton.classList.remove("hidden");
      } else {
        this.cancelBuildButton.classList.add("hidden");
      }
    }

    // Set active button and cursor
    if (selectedBuildingType === "house" && this.buildHouseButton) {
      this.buildHouseButton.classList.add("active");
      this.canvas.style.cursor = "copy";
    } else if (selectedBuildingType === "barrack" && this.buildBarrackButton) {
      this.buildBarrackButton.classList.add("active");
      this.canvas.style.cursor = "copy";
    } else {
      // Not in build mode, set cursor based on dragging
      this.canvas.style.cursor = isDragging ? "grabbing" : "default";
    }
  }

  // Updates the action panel based on the selected building
  updateBuildingActionsPanel(selectedBuilding, game) {
    if (!this.buildingActionsContainer) return;

    // Clear previous actions
    this.buildingActionsContainer.innerHTML = "";

    if (selectedBuilding && selectedBuilding.type === "town_center") {
      // Add villager button for town center
      const villagerButton = document.createElement("button");
      villagerButton.id = "create-villager-button";
      villagerButton.title = "Create Villager (10s)"; // Added time hint
      villagerButton.innerHTML = "🧑‍🌾"; // Villager emoji
      villagerButton.classList.add("action-button");
      villagerButton.addEventListener("click", () => {
        console.log(
          "UI: Create Villager clicked for building:",
          selectedBuilding
        );
        // Call the game method to handle the logic
        game.queueUnitTraining(selectedBuilding, "villager", 1000); // Pass time
      });
      this.buildingActionsContainer.appendChild(villagerButton);
    }
    // Add else-if blocks here for other building types (e.g., Barracks -> Create Soldier)
  }

  // Updates visibility of build buttons based on selected unit
  updateUnitActionsPanel(selectedUnit) {
    const isVillagerSelected = selectedUnit && selectedUnit.type === "villager";

    // Toggle visibility based on villager selection
    const toggleVisibility = (button) => {
      if (button) {
        if (isVillagerSelected) {
          button.classList.remove("hidden");
        } else {
          button.classList.add("hidden");
        }
      }
    };

    toggleVisibility(this.buildHouseButton);
    toggleVisibility(this.buildBarrackButton);

    // Hide cancel button if no villager is selected (it's shown/hidden by updateBuildUI otherwise)
    // Although, updateBuildUI handles the cancel button based on build *mode*,
    // maybe we don't need to touch it here. Let's leave it to updateBuildUI.
    // if (this.cancelBuildButton && !isVillagerSelected) {
    //     this.cancelBuildButton.classList.add('hidden');
    // }

    // Future: Add other unit-specific actions here
  }

  // Helper to show a temporary message (e.g., "Cannot build here")
  showTemporaryMessage(message, duration = 1500) {
    let messageElement = document.getElementById("game-message");
    if (!messageElement) {
      messageElement = document.createElement("div");
      messageElement.id = "game-message";
      messageElement.style.position = "absolute";
      messageElement.style.top = "20px";
      messageElement.style.left = "50%";
      messageElement.style.transform = "translateX(-50%)";
      messageElement.style.padding = "10px 20px";
      messageElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      messageElement.style.color = "white";
      messageElement.style.borderRadius = "5px";
      messageElement.style.zIndex = "1000";
      messageElement.style.pointerEvents = "none"; // Don't interfere with clicks
      document.body.appendChild(messageElement);
    }

    messageElement.textContent = message;
    messageElement.style.display = "block";

    // Clear previous timer if any
    if (messageElement.timer) {
      clearTimeout(messageElement.timer);
    }

    // Hide after duration
    messageElement.timer = setTimeout(() => {
      messageElement.style.display = "none";
      messageElement.timer = null;
    }, duration);
  }
}
