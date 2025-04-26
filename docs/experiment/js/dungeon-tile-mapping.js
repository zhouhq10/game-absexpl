// dungeon-tile-mapping.js
// — you must adjust these indices to wherever each tile lives in your sheets —

export default {
  BLANK: -1,

  FLOOR: {
    STONE:    1,
    CRACKED:  2,
    MOSSY:    3
  },

  WALL: {
    STONE: {
      TOP:      10, BOTTOM: 11,
      LEFT:     12, RIGHT:  13,
      CORNER_NE:14, CORNER_NW:15,
      CORNER_SE:16, CORNER_SW:17
    },
    CRACKED: {
      TOP:      20, BOTTOM: 21,
      LEFT:     22, RIGHT:  23,
      CORNER_NE:24, CORNER_NW:25,
      CORNER_SE:26, CORNER_SW:27
    }
  },

  DOOR: {
    horz: { closed: 30, open: 31 },
    vert: { closed: 32, open: 33 }
  },

  WATER: {
    STATIC:      40,
    COAST_ANIM: [41,42,43,44],   // 4‐frame loop
    DETAILS:    [50,51,52,53]    // 4‐frame loop
  },

  TRAP: {
    SPIKES:      60,
    SPIKES_CRACK:61
  },

  OBJECT: {
    BARREL:      70,
    CRATE:       71,
    PILE_GOLD:   72,
    KEY:         73,
    POT:         74
  },

  DECOR: {
    CRACKS_FLOOR:   { SMALL:80, LARGE:81 },
    CRACKS_WALLS:   { SMALL:82, LARGE:83 },
    COASTS_ANIM:     [90,91,92,93]
  },

  FIRE: {
    SMALL:        100,
    ANIM:        [101,102,103,104]
  }
};
