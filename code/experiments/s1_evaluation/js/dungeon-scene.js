import Player from "./player.js";
import TILES from "./tile-mapping.js";
import TilemapVisibility from "./tilemap-visibility.js";
// import PredefinedDungeon from './predefined-dungeon';

import Dungeon from './dungeon/dungeon.js';
import { dungeonData } from '../../assets/room1.js';
const tmp_rooms = dungeonData.rooms;
const tmp_tiles = dungeonData.tiles;

const SCLAE = 3;
/**
 * Scene that generates a new dungeon
 */
export default class DungeonScene extends Phaser.Scene {
  constructor() {
    super();
    this.level = 0;
  }

  // preload() {
  //   // Load the assets before the scene is created
  //   this.load.image("tiles", "../assets/tilesets/tilesetall-48.png");
  //   this.load.spritesheet(
  //     "characters",
  //     "../assets/tilesets/agent-64.png",
  //     {
  //       frameWidth: 64,
  //       frameHeight: 64,
  //       margin: 1,
  //       spacing: 2,
  //     }
  //   );
  // }

  preload() {
    // Load the assets before the scene is created
    this.load.image("tiles", "../assets/tilesets/tilesetall-16.png");
    this.load.spritesheet(
      "characters",
      "../assets/tilesets/agent-16.png",
      {
        frameWidth: 16,
        frameHeight: 16
      }
    );
  }

  create() {
    this.level++; // Game level - go to the next level when the player reaches the stairs
    this.hasPlayerReachedStairs = false;

    // !! Generate a random world with a few extra options:
    //  - Rooms should only have odd number dimensions so that they have a center tile.
    //  - Doors should be at least 2 tiles away from corners, so that we can place a corner tile on
    //    either side of the door location
    // Source: https://github.com/mikewesthad/dungeon

    // Configuration for dungeon generation
    const dungeonConfig = {
      usePredefined: true, // Set to false for random generation
      predefinedData: dungeonData,
      prettyData: true,
      randomConfig: {
        width: 16,
        height: 16,
        doorPadding: 2,
        rooms: {
          width: { min: 5, max: 13, onlyOdd: true },
          height: { min: 5, max: 13, onlyOdd: true },
        }
      }
    };

    console.log(dungeonConfig.predefinedData.rooms);

    if (dungeonConfig.usePredefined) {
      // Use predefined dungeon layout
      this.dungeon = new Dungeon({
        width: dungeonConfig.predefinedData.env_width,
        height: dungeonConfig.predefinedData.env_height,
        usePredefinedRooms: true,
        predefinedRooms: dungeonConfig.predefinedData.rooms,
        predefinedTiles: dungeonConfig.predefinedData.tiles,
        predefinedVisualTiles: dungeonConfig.predefinedData.visualTiles
      });
    } else {
      // Generate random dungeon
      this.dungeon = new Dungeon(dungeonConfig.randomConfig);
    }

    // Output the dungeon layout to the console for debugging
    console.log(this.dungeon.rooms);
    console.log(this.dungeon.tiles);
    this.dungeon.drawToConsole();

    // // !! Convert the dungeon data to JSON
    // const dungeonData = {
    //   rooms: this.dungeon.rooms,
    //   roomGrid: this.dungeon.roomGrid,
    //   tiles: this.dungeon.tiles
    // };
    // const jsonData = JSON.stringify(dungeonData, null, 2); // Convert to JSON string with pretty print
    // // Wrap the JSON data in a JavaScript export statement
    // const jsData = `export const dungeonData = ${jsonData};`;
    // // Create a Blob from the JavaScript data
    // const blob = new Blob([jsData], { type: 'application/javascript' });
    // // Create a link element
    // const link = document.createElement('a');
    // link.href = URL.createObjectURL(blob);
    // link.download = 'dungeonData.js';
    // // Append the link to the body
    // document.body.appendChild(link);
    // // Programmatically click the link to trigger the download
    // link.click();
    // // Remove the link from the document
    // document.body.removeChild(link);


    // !! Creating a blank tilemap with dimensions matching the dungeon
    const map = this.make.tilemap({
      tileWidth: 16 * SCLAE, 
      tileHeight: 16 * SCLAE,
      width: this.dungeon.width,
      height: this.dungeon.height,
    });
    // - 1px margin, 2px spacing
    // - - Margin is the space around the edges of the tileset
    // - - Spacing is the space between the individual tiles
    // const tileset = map.addTilesetImage("tiles", null, 48, 48, 1, 2); 
    const tileset = map.addTilesetImage("tiles", null, 16, 16);
    this.groundLayer = map.createBlankLayer("Ground", tileset).fill(TILES.BLANK);
    this.stuffLayer = map.createBlankLayer("Stuff", tileset);

    const shadowLayer = map.createBlankLayer("Shadow", tileset).fill(TILES.BLANK);
    this.tilemapVisibility = new TilemapVisibility(shadowLayer);

    // !! Use the array of rooms generated to place tiles in the map
    // - Note: using an arrow function here so that "this" still refers to our scene
    // - Iterate over each room and place the tiles
    this.dungeon.rooms.forEach((room) => {
      const { x, y, width, height, left, right, top, bottom } = room;
      // - - Deconstruct the room object to get the coordinates of the room
      // - - x: leftmost column of the room
      // - - y: topmost row of the room
      // - - width: number of columns in the room
      // - - height: number of rows in the room
      // - - left: leftmost column of the room
      // - - right: rightmost column of the room
      // - - top: topmost row of the room
      // - - bottom: bottommost row of the room

      // !! Fill those that are possible to fill 
      // -> which can be changed in the pre-defined situation
      // - Fill the floor with mostly clean tiles
      this.groundLayer.weightedRandomize(TILES.FLOOR, x + 1, y + 1, width - 2, height - 2);

      // - Place the room corners tiles
      this.groundLayer.putTileAt(TILES.WALL.TOP_LEFT, left, top);
      this.groundLayer.putTileAt(TILES.WALL.TOP_RIGHT, right, top);
      this.groundLayer.putTileAt(TILES.WALL.BOTTOM_RIGHT, right, bottom);
      this.groundLayer.putTileAt(TILES.WALL.BOTTOM_LEFT, left, bottom);

      // - Fill the walls with mostly clean tiles
      this.groundLayer.weightedRandomize(TILES.WALL.TOP, left + 1, top, width - 2, 1);
      this.groundLayer.weightedRandomize(TILES.WALL.BOTTOM, left + 1, bottom, width - 2, 1);
      this.groundLayer.weightedRandomize(TILES.WALL.LEFT, left, top + 1, 1, height - 2);
      this.groundLayer.weightedRandomize(TILES.WALL.RIGHT, right, top + 1, 1, height - 2);

      // Dungeons have rooms that are connected with doors. Each door has an x & y relative to the
      // room's location. Each direction has a different door to tile mapping.
      const doors = room.getDoorLocations(); // → Returns an array of {x, y} objects
      for (let i = 0; i < doors.length; i++) {
        if (doors[i].y === 0) {
          this.groundLayer.putTilesAt(TILES.DOOR.TOP, x + doors[i].x - 1, y + doors[i].y);
        } else if (doors[i].y === room.height - 1) {
          this.groundLayer.putTilesAt(TILES.DOOR.BOTTOM, x + doors[i].x - 1, y + doors[i].y);
        } else if (doors[i].x === 0) {
          this.groundLayer.putTilesAt(TILES.DOOR.LEFT, x + doors[i].x, y + doors[i].y - 1);
        } else if (doors[i].x === room.width - 1) {
          this.groundLayer.putTilesAt(TILES.DOOR.RIGHT, x + doors[i].x, y + doors[i].y - 1);
        }
      }

      // !! More fine-grained control over the tiles
      if (dungeonConfig.usePredefined && dungeonConfig.prettyData) {
        // For predefined rooms, use both semantic and visual tile layouts from the data
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            const semanticTile = room.tiles[row][col];
            const visualTile = this.dungeon.visualTiles[row+y][col+x] - 1;
            
            // 1. Floor 
            if (semanticTile === 2 && visualTile > -1) {
              this.groundLayer.putTileAt(visualTile, x + col, y + row);
            }

            // 2. Wall
            // Use semantic tiles for collision detection
            if (semanticTile === 1 && visualTile > -1) { // Wall
              this.groundLayer.setCollision(x + col, y + row);
              this.groundLayer.putTileAt(visualTile, x + col, y + row);
            }

            // 3. Objects (Boxes)
            if (semanticTile === 4) {
              if (visualTile > -1) {
                this.stuffLayer.putTileAt(visualTile, x + col, y + row); // Check size
              } else {
                this.groundLayer.weightedRandomize(TILES.BOX, x + col, y + row, 1, 2);
              }
            }

            // 4. Chests
            if (semanticTile === 5 && visualTile > -1) {
              this.stuffLayer.putTileAt(visualTile, x + col, y + row);
            }
          }
        }
      }
    });

    // Separate out the rooms into:
    //  - The starting room (index = 0)
    //  - A random room to be designated as the end room (with stairs and nothing else)
    //  - An array of 90% of the remaining rooms, for placing random stuff (leaving 10% empty)
    let startRoom, endRoom, otherRooms;
    if (dungeonConfig.usePredefined) {
      if (dungeonConfig.prettyData) {
        startRoom = this.dungeon.rooms[0];
        console.log(startRoom);
        endRoom = this.dungeon.rooms[this.dungeon.rooms.length - 1];
      } else {
        startRoom = this.dungeon.rooms[0];
        endRoom = Phaser.Utils.Array.RemoveRandomElement(this.dungeon.rooms);
        otherRooms = this.dungeon.rooms.slice(1, this.dungeon.rooms.length * 0.9);
        this.stuffLayer.putTileAt(TILES.CHEST, endRoom.centerX, endRoom.centerY);
      }
    } else {
      const rooms = this.dungeon.rooms.slice(); // → Returns a shallow copy of the rooms array
      const startRoom = rooms.shift(); // → Removes the first element from the array and returns it
      const endRoom = Phaser.Utils.Array.RemoveRandomElement(rooms); // → Removes a random element from the array and returns it  
      // - If there is only one room left, then the otherRooms array is the only room left; otherwise,
      //   it is a shuffled copy of the remaining rooms, with 90% of the elements
      const otherRooms = rooms.length === 1 ? rooms : Phaser.Utils.Array.Shuffle(rooms).slice(0, rooms.length * 0.9); // → Returns a shuffled copy of the array, with 90% of the elements  
      this.stuffLayer.putTileAt(TILES.CHEST, endRoom.centerX, endRoom.centerY);
    }

    // Place stuff in the 90% "otherRooms"
    if (!dungeonConfig.usePredefined) {
    otherRooms.forEach((room) => {
      const rand = Math.random();
      if (rand <= 0.25) {
        // 25% chance of chest
        this.stuffLayer.putTileAt(TILES.CHEST, room.centerX, room.centerY);
      } else if (rand <= 0.5) {
        // 50% chance of a pot anywhere in the room... except don't block a door!
        const x = Phaser.Math.Between(room.left + 2, room.right - 2);
        const y = Phaser.Math.Between(room.top + 2, room.bottom - 2);
        this.stuffLayer.weightedRandomize(x, y, 1, 1, TILES.POT);
      } else {
        // 25% of either 2 or 4 towers, depending on the room size
        if (room.height >= 9) {
          this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY + 1);
          this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY + 1);
          this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY - 2);
          this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY - 2);
        } else {
          this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX - 1, room.centerY - 1);
          this.stuffLayer.putTilesAt(TILES.TOWER, room.centerX + 1, room.centerY - 1);
        }
        }
      });
    }

    // Not exactly correct for the tileset since there are more possible floor tiles, but this will
    // do for the example.
    // this.groundLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]);
    // this.stuffLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]);
    this.groundLayer.setCollisionByExclusion([142, 247, 248, 267, 268, 560]);
    // Set collision for specific stuff layer tiles
    // this.stuffLayer.setCollision([
    //   TILES.CHEST[0][0], TILES.CHEST[0][1], TILES.CHEST[1][0], TILES.CHEST[1][1], // Chest tiles
    //   TILES.POT[0], TILES.POT[1], TILES.POT[2], // Pot tiles
    //   TILES.TOWER[0][0], TILES.TOWER[1][0] // Tower tiles
    // ]);
    // Enable physics for the stuff layer
    this.stuffLayer.setCollisionBetween(0, 1000);

    // // Add debug visualization
    // const debugGraphics = this.add.graphics().setAlpha(0.75);
    // this.stuffLayer.renderDebug(debugGraphics, {
    //   tileColor: null,
    //   collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255),
    //   faceColor: new Phaser.Display.Color(40, 39, 37, 255)
    // });

    for (const tileIndex of TILES.CHEST) {
      this.stuffLayer.setTileIndexCallback(tileIndex, () => {
        // Remove callbacks for all chest tiles after triggering
        for (const index of TILES.CHEST) {
          this.stuffLayer.setTileIndexCallback(index, null);
        }
    
        this.hasPlayerReachedStairs = true;
        this.player.freeze();
    
        const cam = this.cameras.main;
        cam.fade(250, 0, 0, 0);
        cam.once("camerafadeoutcomplete", () => {
          this.player.destroy();
          this.scene.restart();
        });
      });
    }
    // this.stuffLayer.setTileIndexCallback(TILES.CHEST, () => {
    //   this.stuffLayer.setTileIndexCallback(TILES.CHEST, null);
    //   this.hasPlayerReachedStairs = true;
    //   this.player.freeze();
    //   const cam = this.cameras.main;
    //   cam.fade(250, 0, 0, 0);
    //   cam.once("camerafadeoutcomplete", () => {
    //     this.player.destroy();
    //     this.scene.restart();
    //   });
    // });

    // Place the player in the first room
    const playerRoom = startRoom;
    const x = map.tileToWorldX(playerRoom.centerX);
    const y = map.tileToWorldY(playerRoom.centerY);
    this.player = new Player(this, x, y);
    this.player.sprite.setScale(SCLAE);

    // Watch the player and tilemap layers for collisions, for the duration of the scene:
    this.physics.add.collider(this.player.sprite, this.stuffLayer);
    this.physics.add.collider(this.player.sprite, this.groundLayer);
    

    // Phaser supports multiple cameras, but you can access the default camera like this:
    const camera = this.cameras.main;

    // Constrain the camera so that it isn't allowed to move outside the width/height of tilemap
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player.sprite);

    // // Help text that has a "fixed" position on the screen
    // this.add
    //   .text(16, 16, `Find the stairs. Go deeper.\nCurrent level: ${this.level}`, {
    //     font: "18px monospace",
    //     fill: "#000000",
    //     padding: { x: 20, y: 10 },
    //     backgroundColor: "#ffffff",
    //   })
    //   .setScrollFactor(0);
  }

  update(time, delta) {
    if (this.hasPlayerReachedStairs) return;

    this.player.update();

    // Find the player's room using another helper method from the dungeon that converts from
    // dungeon XY (in grid units) to the corresponding room object
    const playerTileX = this.groundLayer.worldToTileX(this.player.sprite.x);
    const playerTileY = this.groundLayer.worldToTileY(this.player.sprite.y);
    const playerRoom = this.dungeon.getRoomAt(playerTileX, playerTileY);

    this.tilemapVisibility.setActiveRoom(playerRoom);
  }
}
