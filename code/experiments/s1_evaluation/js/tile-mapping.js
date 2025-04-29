// Our custom tile mapping with:
// - Single index for putTileAt
// - Array of weights for weightedRandomize
// - Array or 2D array for putTilesAt
// 19 13; starting from 0
// 112 112
const TILE_MAPPING = {
  BLANK: 646,
  WALL: {
    TOP_LEFT: 681,
    TOP_RIGHT: 683,
    BOTTOM_RIGHT: 1057,
    BOTTOM_LEFT: 1055,
    TOP: [
      { index: 702, weight: 9 },
      { index: [682], weight: 1 },
    ],
    LEFT: [
      { index: 1001, weight: 9 },
      { index: [1000], weight: 1 },
    ],
    RIGHT: [
      { index: 737, weight: 9 },
      { index: [738], weight: 1 },
    ],
    BOTTOM: [
      { index: 1036, weight: 9 },
      { index: [1056], weight: 1 },
    ],
  },
  FLOOR: [
    { index: 142, weight: 9 },
    { index: [247, 248, 267, 268], weight: 1 },
  ],
  POT: [
    { index: 606, weight: 1 },
    { index: 607, weight: 1 },
    { index: 608, weight: 1 },
  ],
  DOOR: {
    TOP: [703, 142, 701],
    // prettier-ignore
    LEFT: [
      [1021], 
      [142], 
      [981]
    ],
    BOTTOM: [1037, 142, 1035],
    // prettier-ignore
    RIGHT: [
      [757], 
      [142], 
      [717]
    ],
  },
  CHEST: [
    [98, 99],
    [118, 119]
],
  STAIRS: 560,
  // prettier-ignore
  TOWER: [
    [604],
    [624]
  ],
};

export default TILE_MAPPING;
