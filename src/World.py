import pygame

from src.Controller import Controller
from src.Model import Model
from src.View import ViewWorld


class Jeu:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((400, 400))
        pygame.display.set_caption("MVC Pygame Rule")

        self.model = Model()
        self.view = ViewWorld(self.screen, self.model)
        self.controller = Controller(self.model)

        # Inscription de la vue auprès du modèle
        self.model.addView(self.view)

    def run(self):
        running = True
        self.view.update()  # Premier affichage

        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                self.controller.handleEvent(event)

        pygame.quit()
