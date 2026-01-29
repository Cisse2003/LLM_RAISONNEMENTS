import pygame


class View:
    def update(self):
        pass


class ViewWorld(View):
    def __init__(self, screen, model):
        self.screen = screen
        self.model = model
        self.font = pygame.font.SysFont(None, 24)

    def update(self):
        self.screen.fill((255, 255, 255))  # Fond blanc
        # On boucle sur chaque bouton présent dans le modèle
        for btn in self.model.buttons:
            state = btn.state

            if state == 1:  # Rouge et Vert (Moitié/Moitié)
                pygame.draw.rect(self.screen, (0, 255, 0), btn.rect)
            else:  # Etat 0 : Gris ou Rouge selon votre choix
                pygame.draw.rect(self.screen, (255, 0, 0),btn.rect)

        text = self.font.render(f"Cliquez pour changer", True, (0, 0, 0))
        self.screen.blit(text, (125, 25))
        pygame.display.flip()