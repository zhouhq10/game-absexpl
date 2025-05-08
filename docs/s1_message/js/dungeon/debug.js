// import {TILE_MAPPING} from "./tile-mapping.js";

const attributesToHtmlString = attrObj =>
  Object.entries(attrObj)
    .map(([key, val]) => `${key}="${val}"`)
    .join(" ");

// Debug by dumping a table to the console where each element in the map is the number of rooms in
// that location
// export 
function debugRoomGrid(dungeon) {
  const table = dungeon.roomGrid.map(row => row.map(elem => `${elem.length}`.padStart(2)));
  console.log(table.map(row => row.join(" ")).join("\n"));
}

// export 
function debugHtmlMap(dungeon, config = {}) {
  config = Object.assign(
    {},
    {
      empty: " ",
      emptyAttributes: { class: "dungeon__empty" },
      wall: "#",
      wallAttributes: { class: "dungeon__wall" },
      floor: "_",
      floorAttributes: { class: "dungeon__wall" },
      door: ".",
      doorAttributes: { class: "dungeon__door" },
      containerAttributes: { class: "dungeon" }
    },
    config
  );

  let c = config;
  const tiles = dungeon.getMappedTiles({
    empty: `<td ${attributesToHtmlString(c.emptyAttributes)}>${c.empty}</td>`,
    floor: `<td ${attributesToHtmlString(c.floorAttributes)}>${c.floor}</td>`,
    door: `<td ${attributesToHtmlString(c.doorAttributes)}>${c.door}</td>`,
    wall: `<td ${attributesToHtmlString(c.wallAttributes)}>${c.wall}</td>`
  });

  const tilesHtml = tiles.map(row => `<tr>${row.join("")}</tr>`).join("");
  const htmlString = `<pre ${attributesToHtmlString(
    c.containerAttributes
  )}><table><tbody>${tilesHtml}</tbody></table></pre>`;
  const htmlFragment = document.createRange().createContextualFragment(htmlString);

  return htmlFragment;
}

// Debug by returning a colored(!) table string where each tile in the map is represented with an
// ASCII string
// export 
function debugMap(dungeon, config = {}) {
  config = Object.assign(
    {},
    {
      empty: " ",
      emptyColor: "rgb(0, 0, 0)",
      wall: "#",
      wallColor: "rgb(255, 0, 0)",
      floor: "_",
      floorColor: "rgb(210, 210, 210)",
      door: ".",
      doorColor: "rgb(0, 0, 255)",
      fontSize: "15px",
      box: "O",
      boxColor: "rgb(0, 255, 0)",
      chest: "*",
      chestColor: "rgb(211, 185, 40)"
    },
    config
  );

  let string = "";
  let styles = [];

  // First line in the browser console window has console line mapping (e.g. "dungeon.js:724") which
  // throws off the table. Kill two birds by displaying a guide on the first two lines.
  string += `Dungeon: the console window should be big enough to see all of the guide on the next line:\n`;
  string += `%c|${"=".repeat(dungeon.width * 2 - 2)}|\n\n`;
  styles.push(`font-size: ${config.fontSize}`);

  for (let y = 0; y < dungeon.height; y += 1) {
    for (let x = 0; x < dungeon.width; x += 1) {
      const tile = dungeon.tiles[y][x];
      if (tile === TILE_MAPPING.EMPTY) {
        string += `%c${config.empty}`;
        styles.push(`color: ${config.emptyColor}; font-size: ${config.fontSize}`);
      } else if (tile === TILE_MAPPING.WALL) {
        string += `%c${config.wall}`;
        styles.push(`color: ${config.wallColor}; font-size: ${config.fontSize}`);
      } else if (tile === TILE_MAPPING.FLOOR) {
        string += `%c${config.floor}`;
        styles.push(`color: ${config.floorColor}; font-size: ${config.fontSize}`);
      } else if (tile === TILE_MAPPING.DOOR) {
        string += `%c${config.door}`;
        styles.push(`color: ${config.doorColor}; font-size: ${config.fontSize}`);
      } else if (tile === TILE_MAPPING.BOX) {
        string += `%c${config.box}`;
        styles.push(`color: ${config.boxColor}; font-size: ${config.fontSize}`);
      } else if (tile === TILE_MAPPING.CHEST) {
        string += `%c${config.chest}`;
        styles.push(`color: ${config.chestColor}; font-size: ${config.fontSize}`);
      }
      string += " ";
    }
    string += "\n";
  }
  console.log(string, ...styles);
}
