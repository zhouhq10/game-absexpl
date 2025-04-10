import pygame 

class Timer:
    def __init__(self, duration, func=None):
        # Initialize the timer with a duration and an optional function to call when the timer ends
        self.duration = duration
        self.func = func
        self.start_time = 0
        self.active = False

    def activate(self):
        # Activate the timer and record the start time
        self.active = True
        self.start_time = pygame.time.get_ticks()

    def deactivate(self):
        # Deactivate the timer and reset the start time
        self.active = False
        self.start_time = 0

    def update(self):
        # Check the current time against the start time
        current_time = pygame.time.get_ticks()
        # If the duration has passed, deactivate the timer
        if current_time - self.start_time >= self.duration:
            self.deactivate()
            # If a function was provided, call it
            if self.func:
                self.func()