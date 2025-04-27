import Player from "./player.js";
import TILES from "./tile-mapping.js";
import TilemapVisibility from "./tilemap-visibility.js";
// import PredefinedDungeon from './predefined-dungeon';

import Dungeon from './dungeon/dungeon.js';
import { dungeonData } from '../../assets/dungeonData.js';
const tmp_rooms = dungeonData.rooms;
const tmp_roomGrid = dungeonData.roomGrid;
const tmp_tiles = dungeonData.tiles;

/**
 * Scene that generates a new dungeon
 */
export default class DungeonScene extends Phaser.Scene {
  constructor() {
    super();
    this.level = 0;
  }

  preload() {
    // Load the assets before the scene is created
    this.load.image("tiles", "../assets/tilesets/buch-tileset-48px-extruded.png");
    this.load.spritesheet(
      "characters",
      "../assets/spritesheets/buch-characters-64px-extruded.png",
      {
        frameWidth: 64,
        frameHeight: 64,
        margin: 1,
        spacing: 2,
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
    this.dungeon = new Dungeon({
      width: 15,
      height: 15,
      doorPadding: 2, // Doors are 2 tiles away from corners
      // rooms: tmp_rooms,
      // roomGrid: tmp_roomGrid,
      // tiles: tmp_tiles,
      rooms: {
        width: { min: 5, max: 7, onlyOdd: true },
        height: { min: 5, max: 7, onlyOdd: true },
      },
      usePredefinedRooms: true,
      predefinedRooms: tmp_rooms,
      predefinedRoomGrid: tmp_roomGrid,
      predefinedTiles: tmp_tiles,
    });

    // Output the dungeon layout to the console for debugging
    console.log(this.dungeon.rooms);
    console.log(this.dungeon.roomGrid);
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
      tileWidth: 48,
      tileHeight: 48,
      width: this.dungeon.width,
      height: this.dungeon.height,
    });
    // - 1px margin, 2px spacing
    // - - Margin is the space around the edges of the tileset
    // - - Spacing is the space between the individual tiles
    const tileset = map.addTilesetImage("tiles", null, 48, 48, 1, 2); 
    this.groundLayer = map.createBlankLayer("Ground", tileset).fill(TILES.BLANK);
    this.stuffLayer = map.createBlankLayer("Stuff", tileset);
    const shadowLayer = map.createBlankLayer("Shadow", tileset).fill(TILES.BLANK);

    // TODO: test this out
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

      // Fill the floor with mostly clean tiles
      this.groundLayer.weightedRandomize(TILES.FLOOR, x + 1, y + 1, width - 2, height - 2);

      // Place the room corners tiles
      this.groundLayer.putTileAt(TILES.WALL.TOP_LEFT, left, top);
      this.groundLayer.putTileAt(TILES.WALL.TOP_RIGHT, right, top);
      this.groundLayer.putTileAt(TILES.WALL.BOTTOM_RIGHT, right, bottom);
      this.groundLayer.putTileAt(TILES.WALL.BOTTOM_LEFT, left, bottom);

      // Fill the walls with mostly clean tiles
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
    });

    // Separate out the rooms into:
    //  - The starting room (index = 0)
    //  - A random room to be designated as the end room (with stairs and nothing else)
    //  - An array of 90% of the remaining rooms, for placing random stuff (leaving 10% empty)
    const rooms = this.dungeon.rooms.slice(); // → Returns a shallow copy of the rooms array
    const startRoom = rooms.shift(); // → Removes the first element from the array and returns it
    const endRoom = Phaser.Utils.Array.RemoveRandomElement(rooms); // → Removes a random element from the array and returns it  
    // - If there is only one room left, then the otherRooms array is the only room left; otherwise,
    //   it is a shuffled copy of the remaining rooms, with 90% of the elements
    const otherRooms = rooms.length === 1 ? rooms : Phaser.Utils.Array.Shuffle(rooms).slice(0, rooms.length * 0.9); // → Returns a shuffled copy of the array, with 90% of the elements

    // Place the stairs
    this.stuffLayer.putTileAt(TILES.STAIRS, endRoom.centerX, endRoom.centerY);

    // Place stuff in the 90% "otherRooms"
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

    // Not exactly correct for the tileset since there are more possible floor tiles, but this will
    // do for the example.
    this.groundLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]);
    this.stuffLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]);

    this.stuffLayer.setTileIndexCallback(TILES.STAIRS, () => {
      this.stuffLayer.setTileIndexCallback(TILES.STAIRS, null);
      this.hasPlayerReachedStairs = true;
      this.player.freeze();
      const cam = this.cameras.main;
      cam.fade(250, 0, 0, 0);
      cam.once("camerafadeoutcomplete", () => {
        this.player.destroy();
        this.scene.restart();
      });
    });

    // Place the player in the first room
    const playerRoom = startRoom;
    const x = map.tileToWorldX(playerRoom.centerX);
    const y = map.tileToWorldY(playerRoom.centerY);
    this.player = new Player(this, x, y);

    // Watch the player and tilemap layers for collisions, for the duration of the scene:
    this.physics.add.collider(this.player.sprite, this.groundLayer);
    this.physics.add.collider(this.player.sprite, this.stuffLayer);

    // Phaser supports multiple cameras, but you can access the default camera like this:
    const camera = this.cameras.main;

    // Constrain the camera so that it isn't allowed to move outside the width/height of tilemap
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player.sprite);

    // Help text that has a "fixed" position on the screen
    this.add
      .text(16, 16, `Find the stairs. Go deeper.\nCurrent level: ${this.level}`, {
        font: "18px monospace",
        fill: "#000000",
        padding: { x: 20, y: 10 },
        backgroundColor: "#ffffff",
      })
      .setScrollFactor(0);
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
