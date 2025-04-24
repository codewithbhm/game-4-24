export function toIsometric(x, y, tileWidth, tileHeight) {
  return {
    x: ((x - y) * tileWidth) / 2,
    y: ((x + y) * tileHeight) / 2,
  };
}

export function getTerrainColor(type) {
  switch (type) {
    case 0:
      return "#2ecc71"; // Grass
    case 1:
      return "#f1c40f"; // Desert
    case 2:
      return "#3498db"; // Water
    default:
      return "#2ecc71";
  }
}
