export class AssetLoader {
  constructor() {
    // Define asset types here or pass them in if they become dynamic
    this.treeTypes = ["pine", "palm", "willow"];
    this.buildingTypes = ["house", "barrack", "town_center"];
    this.unitTypes = ["villager"];

    // Store loaded assets internally
    this.assets = {
      trees: {},
      buildingAssets: {},
      unitAssets: {},
    };
  }

  loadAssets() {
    return new Promise(async (resolve, reject) => {
      const assetPromises = [];

      // Load tree assets
      this.treeTypes.forEach((type) => {
        const promise = new Promise((resolveLoad, rejectLoad) => {
          const img = new Image();
          img.onload = () => {
            this.assets.trees[type] = img;
            // console.log(`Loaded tree asset: ${type}`);
            resolveLoad();
          };
          img.onerror = rejectLoad;
          img.src = `assets/${type}-tree.svg`;
        });
        assetPromises.push(promise);
      });

      // Load building assets
      this.buildingTypes.forEach((type) => {
        const promise = new Promise((resolveLoad, rejectLoad) => {
          const img = new Image();
          img.onload = () => {
            this.assets.buildingAssets[type] = img;
            // console.log(`Loaded building asset: ${type}`);
            resolveLoad();
          };
          img.onerror = (err) => {
            console.error(`Failed to load ${type} asset:`, err);
            rejectLoad(err);
          };
          img.src = `assets/${type}.svg`;
        });
        assetPromises.push(promise);
      });

      // Load unit assets
      this.unitTypes.forEach((type) => {
        const promise = new Promise((resolveLoad, rejectLoad) => {
          const img = new Image();
          img.onload = () => {
            this.assets.unitAssets[type] = img;
            // console.log(`Loaded unit asset: ${type}`);
            resolveLoad();
          };
          img.onerror = (err) => {
            console.error(`Failed to load ${type} asset:`, err);
            rejectLoad(err);
          };
          img.src = `assets/${type}.svg`;
        });
        assetPromises.push(promise);
      });

      try {
        await Promise.all(assetPromises);
        console.log("All assets loaded successfully.");
        resolve(this.assets); // Resolve the main promise with the loaded assets
      } catch (error) {
        console.error("Error loading one or more assets:", error);
        reject(error); // Reject the main promise if any asset fails
      }
    });
  }
}
