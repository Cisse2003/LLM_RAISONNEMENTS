import pygame

class Controller:
    def __init__(self, model):
        self.model = model

    def handleEvent(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            for btn in self.model.buttons:
                if btn.rect.collidepoint(event.pos):
                    self.model.appliquerEffet(btn)