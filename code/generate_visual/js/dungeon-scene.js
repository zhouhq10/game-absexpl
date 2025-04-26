import TILES from "./dungeon-tile-mapping.js";

// Insert trial name to visualize below
export let gridName = "test";

let grid;
import(`../assets/dungeon_trials/${gridName}.js`).then(module => {
  grid = module.default;
}).catch(error => {
  console.error("Failed to load the grid:", error);
});

export default class DungeonScene extends Phaser.Scene {
  constructor() {
    super({ key: "DungeonScene" });
    this.gridName = gridName;
  }

  preload() {
    // Load tilesets
    this.load.image("wallFloor", "../assets/dungeon_tilesets/wall_floor.png");
    this.load.image("character", "../assets/dungeon_tilesets/character.png");
    this.load.image("characterR", "../assets/dungeon_tilesets/character_reverse.png");
    this.load.image("object", "../assets/dungeon_tilesets/objects.png");
    this.load.image("doorLever", "../assets/dungeon_tilesets/door_lever.png");
  }

  create() {
    // Create blank map
    const map = this.make.tilemap({
      tileWidth: 16,
      tileHeight: 16,
      width: grid.width,
      height: grid.height
    });

    // Add tilesets
    const tsWallFloor = map.addTilesetImage("wallFloor", "wallFloor");
    const tsCharacter = map.addTilesetImage("character", "character");
    const tsCharacterReverse = map.addTilesetImage("characterR", "characterR");
    const tsObjects = map.addTilesetImage("object", "object");
    const tsDoorLever = map.addTilesetImage("doorLever", "doorLever");

    const allTilesets = [tsWallFloor, tsCharacter, tsCharacterReverse, tsObjects, tsDoorLever];

    // Create layers
    this.floor = map.createBlankLayer("Floor", allTilesets);
    this.walls = map.createBlankLayer("Wall", allTilesets);
    this.objects = map.createBlankLayer("Object", allTilesets);
    this.characters = map.createBlankLayer("Character", allTilesets);
    this.foreground = map.createBlankLayer("Foreground", allTilesets);

    // Process the layout
    this.processLayout(grid);

    // Set collision for walls and objects
    this.walls.setCollisionByProperty({ collides: true });
    this.objects.setCollisionByProperty({ collides: true });

    // Set camera bounds
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  }

  processLayout(grid) {
    const wall_type = grid.wall_type;
    const floor_type = grid.floor_type;
    console.log(grid.floor_type);

    // Process each cell in the layout
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const symbol = grid.layout[y][x];
        const tileType = grid.symbols[symbol];

        switch (tileType) {
          case "WALL":
            this.placeWall(x, y, wall_type);
            break;
          case "FLOOR":
            this.placeFloor(x, y, floor_type);
            break;
          case "DOOR":
            this.placeDoor(x, y);
            break;
          case "CHEST":
          case "BARREL":
          case "POT":
          case "TORCH":
            this.placeObject(x, y, tileType);
            break;
          case "ENEMY":
          case "NPC":
            this.placeCharacter(x, y, tileType);
            break;
          case "LEVER":
            this.placeLever(x, y);
            break;
        }
      }
    }
  }

  placeWall(x, y, wall_type) {
    // Place floor under wall
    this.floor.putTileAt(TILES.FLOOR[floor_type], x, y);
    
    // Place wall
    this.walls.putTileAt(TILES.WALL[wall_type].TOP, x, y);
  }

  placeFloor(x, y, floor_type) {
    this.floor.putTileAt(TILES.FLOOR[floor_type], x, y);
  }

  placeDoor(x, y) {
    // Place floor under door
    this.floor.putTileAt(TILES.FLOOR[grid.floor_type], x, y);
    
    // Place door
    this.objects.putTileAt(TILES.DOOR.HORIZONTAL.CLOSED, x, y);
  }

  placeObject(x, y, type) {
    // Place floor under object
    this.floor.putTileAt(TILES.FLOOR[grid.floor_type], x, y);
    
    // Place object
    this.objects.putTileAt(TILES.OBJECT[type], x, y);
  }

  placeCharacter(x, y, type) {
    // Place floor under character
    this.floor.putTileAt(TILES.FLOOR[grid.floor_type], x, y);
    
    // Place character
    this.characters.putTileAt(TILES.CHARACTER[type], x, y);
  }

  placeLever(x, y) {
    // Place floor under lever
    this.floor.putTileAt(TILES.FLOOR[grid.floor_type], x, y);
    
    // Place lever
    this.objects.putTileAt(TILES.LEVER.OFF, x, y);
  }
}
