/**
 * Author: Michael Hadley, mikewesthad.com
 * Asset Credits:
 *  - Tileset, Michele "Buch" Bucelli (tileset artist) & Abram Connelly (tileset sponsor):
 *     https://opengameart.org/content/top-down-dungeon-tileset
 *  - Character, Michele "Buch" Bucelli:
 *      https://opengameart.org/content/a-platformer-in-the-forest
 */

import DungeonScene from "./dungeon/dungeon-scene.js";
import {roomTest1Config} from "./trial/maps/room1.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 800,
  backgroundColor: "#000",
  parent: "game-container",
  pixelArt: true,
  scene: new DungeonScene(roomTest1Config),
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
};

const game = new Phaser.Game(config);
