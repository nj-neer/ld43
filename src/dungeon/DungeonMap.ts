import * as Dungeon from "@mikewesthad/dungeon";
import TILES from "../helpers/tiledDungeonMap";
import TilemapVisibility from "../helpers/tiledMapVisibility";
import Ennemie from "../Ennemie";
export default class DungeonLoader {
  dungeon: Dungeon;
  groundLayer: any;
  stuffLayer: any;
  map: any;
  tileset: any;
  spawn: any;
  spawn2: any;
  protected scene: Phaser.Scene;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.spawn2 = [];
    // Generate a random world with a few extra options:
    //  - Rooms should only have odd dimensions so that they have a center tile.
    //  - Doors should be at least 2 tiles away from corners, to leave enough room for the tiles
    //    that we're going to put on either side of the door opening.
    this.dungeon = new Dungeon({
      width: 60,
      height: 60,
      doorPadding: 4,
      rooms: {
        width: { min: 4, max: 9, onlyOdd: true },
        height: { min: 9, max: 15, onlyOdd: true }
      }
    });
    // Creating a blank tilemap with dimensions matching the dungeon
    this.map = scene.make.tilemap({
      tileWidth: 64,
      tileHeight: 64,
      width: this.dungeon.width,
      height: this.dungeon.height
    });

    const tileset = this.map.addTilesetImage(
      "dungeon_tiles",
      null,
      64,
      64,
      0,
      0
    ); // 1px margin, 2px spacing
    this.scene.groundLayer = this.map.createBlankDynamicLayer("Ground", tileset);
    this.stuffLayer = this.map.createBlankDynamicLayer("Stuff", tileset);
    this.spawn = this.map.createBlankDynamicLayer("Spawn", tileset);
    this.generateFogOfWar(tileset);
    this.renderRooms();
    this.renderOtherRooms();
    this.scene.groundLayer.setCollisionByExclusion([
      13,14,15,21,20,19,18,28,27,29,26
    ]);
  }

  private renderRooms() {

    this.scene.wallGroup = this.scene.physics.add.staticGroup();
    // Use the array of rooms generated to place tiles in the map
    // Note: using an arrow function here so that "this" still refers to our scene
    this.dungeon.rooms.forEach(room => {
      const { x, y, width, height, left, right, top, bottom } = room;

      // Fill the floor with mostly clean tiles
      this.scene.groundLayer.weightedRandomize(
        x + 1,
        y + 1,
        width - 2,
        height - 2,
        TILES.FLOOR
      );

      // Place the room corners tiles
      this.scene.groundLayer.putTileAt(TILES.WALL.TOP_LEFT, left, top);
      this.scene.groundLayer.putTileAt(TILES.WALL.TOP_RIGHT, right, top);
      this.scene.groundLayer.putTileAt(TILES.WALL.BOTTOM_RIGHT, right, bottom);
      this.scene.groundLayer.putTileAt(TILES.WALL.BOTTOM_LEFT, left, bottom);

      // Fill the walls with mostly clean tiles
      let topWall = this.scene.groundLayer.weightedRandomize(
        left + 1,
        top,
        width - 2,
        1,
        TILES.WALL.TOP
      );
      this.scene.groundLayer.weightedRandomize(
        left + 1,
        bottom,
        width - 2,
        1,
        TILES.WALL.BOTTOM
      );
      this.scene.groundLayer.weightedRandomize(
        left,
        top + 1,
        1,
        height - 2,
        TILES.WALL.LEFT
      );
      this.scene.groundLayer.weightedRandomize(
        right,
        top + 1,
        1,
        height - 2,
        TILES.WALL.RIGHT
      );

      // Dungeons have rooms that are connected with doors. Each door has an x & y relative to the
      // room's location. Each direction has a different door to tile mapping.
      var doors = room.getDoorLocations(); // → Returns an array of {x, y} objects
      for (var i = 0; i < doors.length; i++) {
        if (doors[i].y === 0) {
          this.scene.groundLayer.putTilesAt(
            TILES.DOOR.TOP,
            x + doors[i].x - 1,
            y + doors[i].y
          );
        } else if (doors[i].y === room.height - 1) {
          this.scene.groundLayer.putTilesAt(
            TILES.DOOR.BOTTOM,
            x + doors[i].x - 1,
            y + doors[i].y
          );
        } else if (doors[i].x === 0) {
          this.scene.groundLayer.putTilesAt(
            TILES.DOOR.LEFT,
            x + doors[i].x,
            y + doors[i].y - 1
          );
        } else if (doors[i].x === room.width - 1) {
          this.scene.groundLayer.putTilesAt(
            TILES.DOOR.RIGHT,
            x + doors[i].x,
            y + doors[i].y - 1
          );
        }
      }
    });
    let wallIndex = [41, 39, 40,41,42];

    this.scene.groundLayer.forEachTile(tile => {
      if (wallIndex.includes(tile.index)) {
        // A sprite has its origin at the center, so place the sprite at the center of the tile
        const x = tile.getCenterX();
        const y = tile.getCenterY();
        this.scene.wallGroup.create(x, y, "wall");
      }
    });
  }

  private renderOtherRooms() {
    // Place stuff in the 90% "otherRooms"
    this.getOtherRooms().forEach(room => {
      var rand = Math.random();
      if (rand <= 0.25) {
        const x = Phaser.Math.Between(room.left + 1, room.right - 1);
        const y = Phaser.Math.Between(room.top + 1, room.bottom - 1);
        this.stuffLayer.weightedRandomize(x, y, 1, 1, TILES.POT);
        // 25% chance of chest
       // this.stuffLayer.putTileAt(TILES.CHEST, room.centerX, room.centerY);
      } else if (rand <= 0.8) {
        // 50% chance of a pot anywhere in the room... except don't block a door!
        this.spawn.putTileAt(16 ,room.centerX, room.centerY);
         this.spawn2.push({x: room.centerX, y:room.centerY});

      } else {
        // 25% of either 2 or 4 towers, depending on the room size
      }
    });
  }

  public spawnEnnemy() {
    let tabEnnemy = [];
    this.spawn2.forEach( (spawn) => {
      //Check if the ennemy will spawn on the player and prevent it
      if(this.scene.player.playerObject.x !== spawn.x*64 && this.scene.player.playerObject.y !== spawn.y*64) {
        let badBoy = new Ennemie(this.scene, spawn.x*64, spawn.y*64);
        this.watchCollisionEnnemy(badBoy);
        tabEnnemy.push(badBoy);
        console.log('tsest')
      }
    });
    console.log(tabEnnemy)
    return tabEnnemy;
  }

  public getMap() {
    return this.map;
  }

  private generateFogOfWar(tileset) {
    const shadowLayer = this.getMap().createBlankDynamicLayer("Shadow", tileset);
    shadowLayer.fill(TILES.BLANK);
    this.scene.tilemapVisibility = new TilemapVisibility(shadowLayer);
  }

  private getDungeonRooms() {
    // Separate out the rooms into:
    //  - The starting room (index = 0)
    //  - A random room to be designated as the end room (with stairs and nothing else)
    //  - An array of 90% of the remaining rooms, for placing random stuff (leaving 10% empty)
    return this.dungeon.rooms.slice();
  }

  public getstartingRoom() {
    return this.getDungeonRooms().shift();
  }

  public getendingRoom() {
    return Phaser.Utils.Array.RemoveRandomElement(this.getDungeonRooms());
  }

  public getOtherRooms() {
    return Phaser.Utils.Array.Shuffle(this.getDungeonRooms()).slice(
      0,
      this.getDungeonRooms().length * 0.85
    );
  }

  public getPlayerRoom(player) {
    // Find the player's room using another helper method from the dungeon that converts from
    // dungeon XY (in grid units) to the corresponding room object
    const playerTileX = this.scene.groundLayer.worldToTileX(player.playerObject.x);
    const playerTileY = this.scene.groundLayer.worldToTileY(player.playerObject.y);
    const playerRoom = this.dungeon.getRoomAt(playerTileX, playerTileY);
    return playerRoom;
  }

  public watchCollision(player) {
    // Watch the player and ground layer for collisions, for the duration of the scene:
    this.scene.physics.add.collider(player.playerObject, this.scene.groundLayer);
  }

  public watchCollisionEnnemy(ennemy) {
    // Watch the ennemy and ground layer for collisions, for the duration of the scene:
    this.scene.physics.add.collider(ennemy.ennemieObject, this.scene.groundLayer);
  }
}
