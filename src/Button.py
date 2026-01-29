import pygame


class Button:

    def __init__(self, id, x, y, width, height):
        self.id = id
        self.state = 0
        self.rect = pygame.Rect(x, y, width, height) # Zone cliquable
    def changeState(self):
        self.state=not self.state