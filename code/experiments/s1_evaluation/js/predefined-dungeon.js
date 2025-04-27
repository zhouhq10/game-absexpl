import TILES from './tile-mapping';

// // Mock Room class for testing
// class Room {
//   constructor(width, height) {
//     this.width = width;
//     this.height = height;
//   }
//   setPosition(x, y) {}
//   setTileAt(x, y, tile) {}
// }

// Define DungeonConfig type
// Removed type annotations for JavaScript

// Define PredefinedLayout
// Removed type annotations for JavaScript

export class PredefinedDungeon extends Dungeon {
  constructor(config, layout) {
    super(config);
    this.layout = layout;
    this.initializeFromLayout();
  }

  initializeFromLayout() {
    // Clear existing rooms
    this.rooms = [];
    
    // Create a single room that covers the entire layout
    const room = new Room(this.width, this.height);
    room.setPosition(0, 0);
    // Assuming Dungeon has a public method or property to manipulate rooms
    // If not, consider modifying Dungeon to expose necessary functionality

    // Process the layout and set tiles
    for (let y = 0; y < this.height; y++) {
      const row = this.layout.layout[y];
      for (let x = 0; x < this.width; x++) {
        const symbol = row[x];
        const tileType = this.layout.symbols[symbol];
        
        if (tileType === "WALL") {
          room.setTileAt(x, y, TILES.WALL);
        } else if (tileType === "FLOOR") {
          room.setTileAt(x, y, TILES.FLOOR);
        } else if (tileType === "DOOR") {
          room.setTileAt(x, y, TILES.DOOR);
        }
      }
    }
  }
} 