import pygame, sys
from settings import *
from level import Level

class Game:
    def __init__(self):
        # Initialize all imported pygame modules
        pygame.init()
        
        # Set up the display window with specified width and height
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        
        # Set the window title
        pygame.display.set_caption('Sprout land')
        
        # Create a clock object to manage time
        self.clock = pygame.time.Clock()
        
        # Initialize the game level
        self.level = Level()

    def run(self):
        # Main game loop
        while True:
            # Event handling loop
            for event in pygame.event.get():
                # If the quit event is triggered, exit the game
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
  
            # Calculate delta time (time since last frame) in seconds
            # Why do we need it? 
            # -> with dt, we can make movements and animations frame rate independent. 
            # -> self.clock.tick() returns the number of milliseconds since the last call to tick(). 
            # -> Dividing by 1000 converts this value to seconds, which is more intuitive for calculations involving speed and time.
            dt = self.clock.tick() / 1000 
            
            # Run the game level logic with the delta time
            self.level.run(dt)
            
            # Update the display with any changes
            pygame.display.update()


if __name__ == '__main__':
    game = Game()
    game.run()