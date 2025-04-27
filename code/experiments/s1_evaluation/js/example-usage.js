import Dungeon from './dungeon/dungeon.js';

// Example 1: Using randomly generated dungeon
const randomDungeon = new Dungeon({
  width: 20,
  height: 20,
  randomSeed: 12,
  doorPadding: 1,
  rooms: {
    width: { min: 3, max: 9 },
    height: { min: 3, max: 9 },
    maxArea: 15,
    maxRooms: 4
  }
});

// Example 2: Using predefined dungeon data from dungeonData.js
const predefinedDungeon = new Dungeon({
  // The dimensions should match the data in dungeonData.js
  width: 10,
  height: 10,
  usePredefinedRooms: true
});

// You can access the tiles, rooms, and room grid from either dungeon
console.log('Random Dungeon Rooms:', randomDungeon.rooms.length);
console.log('Predefined Dungeon Rooms:', predefinedDungeon.rooms.length);

// You can draw the dungeons to HTML for visualization
randomDungeon.drawToConsole();
predefinedDungeon.drawToConsole(); 