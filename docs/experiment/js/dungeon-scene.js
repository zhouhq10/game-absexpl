import TILES from "./dungeon-tile-mapping.js";

export let gridName = "test";

let gridStr;
import(`../dungeon_trials/${gridName}.js`)
  .then(m => gridStr = m.default)
  .catch(err => console.error("Failed to load dungeon JSON:", err));

export default class DungeonScene extends Phaser.Scene {
  constructor() {
    super({ key: "DungeonScene" });
    this.gridName = gridName;
  }

  preload() {
    // static tilesets
    this.load.image("wallsFloor",        "../tilesets/walls_floor.png");
    this.load.image("cracksFloor",      "../tilesets/decorative_cracks_floor.png");
    this.load.image("cracksWalls",      "../tilesets/decorative_cracks_walls.png");
    this.load.image("objects",          "../tilesets/Objects.png");

    // animated tilesheets (32×32 frames)
    this.load.spritesheet("cracksCoastAnim",  "../tilesets/decorative_cracks_coasts_animation.png", { frameWidth:32, frameHeight:32 });
    this.load.spritesheet("waterCoastAnim",   "../tilesets/Water_coasts_animation.png",            { frameWidth:32, frameHeight:32 });
    this.load.spritesheet("waterDetailAnim",  "../tilesets/water_details_animation.png",           { frameWidth:32, frameHeight:32 });
    this.load.spritesheet("doorAnim",         "../tilesets/doors_lever_chest_animation.png",       { frameWidth:32, frameHeight:32 });
    this.load.spritesheet("fireAnim",         "../tilesets/fire_animation.png",                    { frameWidth:32, frameHeight:32 });
    this.load.spritesheet("trapAnim",         "../tilesets/trap_animation.png",                    { frameWidth:32, frameHeight:32 });
  }

  create() {
    const grid = JSON.parse(gridStr);

    const map = this.make.tilemap({
      tileWidth: 32,
      tileHeight: 32,
      width:  grid.width,
      height: grid.height
    });

    // register each image/spritesheet as a separate Tileset
    const tsBase       = map.addTilesetImage("walls_floor",       "wallsFloor");
    const tsCrackFloor = map.addTilesetImage("cracks_floor",      "cracksFloor");
    const tsCrackWall  = map.addTilesetImage("cracks_walls",      "cracksWalls");
    const tsObjects    = map.addTilesetImage("Objects",           "objects");
    const tsCrackCoast = map.addTilesetImage("cracks_coast_anim", "cracksCoastAnim");
    const tsWaterCoast = map.addTilesetImage("water_coast_anim",  "waterCoastAnim");
    const tsWaterDet   = map.addTilesetImage("water_detail_anim", "waterDetailAnim");
    const tsDoors      = map.addTilesetImage("door_anim",         "doorAnim");
    const tsFire       = map.addTilesetImage("fire_anim",         "fireAnim");
    const tsTrap       = map.addTilesetImage("trap_anim",         "trapAnim");

    const allTilesets = [
      tsBase, tsCrackFloor, tsCrackWall,
      tsObjects, tsCrackCoast, tsWaterCoast,
      tsWaterDet, tsDoors, tsFire, tsTrap
    ];

    // create layers
    const floorLayer = map.createBlankLayer("Floor",       allTilesets);
    const wallLayer  = map.createBlankLayer("Walls",       allTilesets);
    const objLayer   = map.createBlankLayer("Objects",     allTilesets);
    const decoLayer  = map.createBlankLayer("Decorations", allTilesets);
    const animLayer  = map.createBlankLayer("Animations",  allTilesets);

    // 1) FLOORS
    grid.floor.forEach(({ variant, x, y }) => {
      floorLayer.putTileAt(TILES.FLOOR[variant], x, y);
    });

    // 2) WALLS
    grid.walls.forEach(({ type, variant, x, y }) => {
      wallLayer.putTileAt(TILES.WALL[type][variant], x, y);
    });

    // 3) WATER
    grid.water.static.forEach(({ x, y }) => {
      floorLayer.putTileAt(TILES.WATER.STATIC, x, y);
    });
    grid.water.coast_anim.forEach(({ frame, x, y }) => {
      animLayer.putTileAt(TILES.WATER.COAST_ANIM[frame], x, y);
    });
    grid.water.details.forEach(({ frame, x, y }) => {
      animLayer.putTileAt(TILES.WATER.DETAILS[frame], x, y);
    });

    // 4) DOORS
    grid.doors.forEach(({ dir, state, x, y }) => {
      wallLayer.putTileAt(TILES.DOOR[dir][state], x, y);
    });

    // 5) TRAPS
    grid.traps.forEach(({ type, x, y }) => {
      objLayer.putTileAt(TILES.TRAP[type], x, y);
    });

    // 6) OBJECTS (barrels, crates, gold, keys…)
    grid.objects.forEach(({ type, x, y }) => {
      objLayer.putTileAt(TILES.OBJECT[type], x, y);
    });

    // 7) DECORATIVE CRACKS & COASTS
    grid.decor.cracks_floor.forEach(({ variant, x, y }) => {
      decoLayer.putTileAt(TILES.DECOR.CRACKS_FLOOR[variant], x, y);
    });
    grid.decor.cracks_walls.forEach(({ variant, x, y }) => {
      decoLayer.putTileAt(TILES.DECOR.CRACKS_WALLS[variant], x, y);
    });
    grid.decor.coasts_anim.forEach(({ frame, x, y }) => {
      animLayer.putTileAt(TILES.DECOR.COASTS_ANIM[frame], x, y);
    });

    // 8) FIRE (torches, braziers…)
    grid.fire.forEach(({ state, x, y }) => {
      animLayer.putTileAt(TILES.FIRE[state], x, y);
    });
  }
}
