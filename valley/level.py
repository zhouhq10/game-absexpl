import pygame
from pytmx.util_pygame import load_pygame

from settings import *
from player import Player
from overlay import Overlay
from sprites import Generic, Water, WildFlower, Tree
from support import *


class Level:
    def __init__(self):
        # Get the display surface to draw on
        self.display_surface = pygame.display.get_surface()

        # Sprite groups
        # Group in pygame is used to manage and update multiple sprites
        self.all_sprites = CameraGroup()  # pygame.sprite.Group()
        self.collision_sprites = pygame.sprite.Group() # keep track of all the sprites that have collision

        self.setup()
        self.overlay = Overlay(self.player)

    def setup(self):
        tmx_data = load_pygame(
            "/Users/zhouhanqi/Documents/GitHub/game-absexpl/valley/game_assets/data/map.tmx"
        )

        # House
        for layer in ["HouseFloor", "HouseFurnitureBottom"]:
            for x, y, surf in tmx_data.get_layer_by_name(layer).tiles():
                Generic(
                    (x * TILE_SIZE, y * TILE_SIZE),
                    surf,
                    self.all_sprites,
                    LAYERS["house bottom"],
                )

        for layer in ["HouseWalls", "HouseFurnitureTop"]:
            for x, y, surf in tmx_data.get_layer_by_name(layer).tiles():
                Generic((x * TILE_SIZE, y * TILE_SIZE), surf, self.all_sprites)

        # Fence
        for x, y, surf in tmx_data.get_layer_by_name("Fence").tiles():
            Generic((x * TILE_SIZE, y * TILE_SIZE), surf, [self.all_sprites, self.collision_sprites])

        # Water
        water_frames = import_folder(
            "/Users/zhouhanqi/Documents/GitHub/game-absexpl/valley/game_assets/graphics/water"
        )
        for x, y, surf in tmx_data.get_layer_by_name("Water").tiles():
            Water((x * TILE_SIZE, y * TILE_SIZE), water_frames, self.all_sprites)

        # Trees
        for obj in tmx_data.get_layer_by_name("Trees"):
            Tree((obj.x, obj.y), obj.image, [self.all_sprites, self.collision_sprites], obj.name)

        # Wildflowers
        for obj in tmx_data.get_layer_by_name("Decoration"):
            WildFlower((obj.x, obj.y), obj.image, [self.all_sprites, self.collision_sprites])

        self.player = Player((640, 360), self.all_sprites, self.collision_sprites)
        Generic(
            pos=(0, 0),
            surf=pygame.image.load(
                "/Users/zhouhanqi/Documents/GitHub/game-absexpl/valley/game_assets/graphics/world/ground.png"
            ).convert_alpha(),
            groups=self.all_sprites,
            z=LAYERS["ground"],
        )

    def run(self, dt):
        # Fill the display surface with black color
        self.display_surface.fill("black")

        # Draw all sprites in the group onto the display surface
        # self.all_sprites.draw(self.display_surface)
        self.all_sprites.custom_draw(self.player)

        # Update all sprites in the group
        self.all_sprites.update(dt)

        # Display the overlay
        self.overlay.display()


class CameraGroup(pygame.sprite.Group):
    def __init__(self):
        super().__init__()
        self.display_surface = pygame.display.get_surface()
        self.offset = pygame.math.Vector2()

    def custom_draw(self, player):
        self.offset.x = player.rect.centerx - SCREEN_WIDTH / 2
        self.offset.y = player.rect.centery - SCREEN_HEIGHT / 2

        for layer in LAYERS.values():
            for sprite in sorted(self.sprites(), key = lambda sprite: sprite.rect.centery):
                if sprite.z == layer:
                    offset_rect = sprite.rect.copy()
                    offset_rect.center -= self.offset
                    self.display_surface.blit(sprite.image, offset_rect)

                    # # anaytics
                    # if sprite == player:
                    # 	pygame.draw.rect(self.display_surface,'red',offset_rect,5)
                    # 	hitbox_rect = player.hitbox.copy()
                    # 	hitbox_rect.center = offset_rect.center
                    # 	pygame.draw.rect(self.display_surface,'green',hitbox_rect,5)
                    # 	target_pos = offset_rect.center + PLAYER_TOOL_OFFSET[player.status.split('_')[0]]
                    # 	pygame.draw.circle(self.display_surface,'blue',target_pos,5)