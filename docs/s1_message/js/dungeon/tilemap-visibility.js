/**
 * A small helper class that can take control of our shadow tilemap layer. It keeps track of which
 * room is currently active and which tiles are visible around the player.
 */
// export default 
class TilemapVisibility {
  constructor(shadowLayer, tilemap, areaRadius = 1) {
    this.shadowLayer = shadowLayer;
    this.tilemap = tilemap; // Need this to check for walls
    this.activeRoom = null;
    this.currentPlayerTile = null;
    this.previouslyLitTiles = new Set(); // Track tiles that have been lit before
    this.areaRadius = areaRadius;
  }

  setPlayerPosition(tileX, tileY) {
    // Only update if the player has moved to a new tile
    if (this.currentPlayerTile?.x === tileX && this.currentPlayerTile?.y === tileY) {
      return;
    }

    // First, dim all previously lit tiles (except the current FoV area)
    this.previouslyLitTiles.forEach(tileKey => {
      const [x, y] = tileKey.split(',').map(Number);
      // Only dim if it's not in the current 5x5 area
      if (Math.abs(x - tileX) > this.areaRadius || Math.abs(y - tileY) > this.areaRadius) {
        this.shadowLayer.getTileAt(x, y).alpha = 0.5;
      }
    });

    // Store the new player position
    this.currentPlayerTile = { x: tileX, y: tileY };

    // Light up the current FoV area around the player, checking for walls
    for (let y = tileY - this.areaRadius; y <= tileY + this.areaRadius; y++) {
      for (let x = tileX - this.areaRadius; x <= tileX + this.areaRadius; x++) {
        // Skip if the tile is out of bounds
        if (!this.shadowLayer.getTileAt(x, y)) continue;

        const tile = this.shadowLayer.getTileAt(x, y);
        if (tile) {
          tile.alpha = 0; // Make fully visible
          this.previouslyLitTiles.add(`${x},${y}`); // Mark as previously lit
        }
        // Check if there's a clear path to the player
        // if (this.hasClearPathToPlayer(x, y, tileX, tileY)) {
        //   const tile = this.shadowLayer.getTileAt(x, y);
        //   tile.alpha = 0; // Make fully visible
        //   this.previouslyLitTiles.add(`${x},${y}`); // Mark as previously lit
        // }
      }
    }
  }


  // Helper method to check if there's a clear path from a tile to the player
  hasClearPathToPlayer(x, y, playerX, playerY) {
    // Get the direction vector from the tile to the player
    const dx = playerX - x;
    const dy = playerY - y;
    
    // If we're checking the player's position itself, it's always visible
    if (dx === 0 && dy === 0) return true;

    // Calculate the number of steps needed to check the path
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    // Check each step along the path
    for (let i = 1; i <= steps; i++) {
      const checkX = x + Math.round((dx * i) / steps);
      const checkY = y + Math.round((dy * i) / steps);
      
      // If we hit a wall before reaching the player, the path is blocked
      const tile = this.tilemap[checkY][checkX];
      console.log(tile);
      if (tile && tile == 1) { // -1 is typically the empty tile index
        return false;
      }
    }
    return true;
  }

  // Helper to set the alpha on all tiles within a room
  setRoomAlpha(room, alpha) {
    this.shadowLayer.forEachTile(
      (tile) => {
        // Only set alpha if the tile hasn't been lit by the player's torch
        if (!this.previouslyLitTiles.has(`${tile.x},${tile.y}`)) {
          tile.alpha = alpha;
        }
      },
      this,
      room.x,
      room.y,
      room.width,
      room.height
    );
  }

  setActiveRoom(room) {
    // We only need to update the tiles if the active room has changed
    if (room !== this.activeRoom) {
      // First, dim all tiles in the old room
      if (this.activeRoom) {
        this.setRoomAlpha(this.activeRoom, 0.5);
      }
      
      // Then make the new room visible
      this.setRoomAlpha(room, 0);
      this.activeRoom = room;
    }
  }
}
