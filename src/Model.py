from src.Button import Button
from src.Rule import Rule


class Model:
    def __init__(self):
        self.views = []
        self.rule = Rule()
        self.buttons = []
        for i in range(3):  # Lignes (y)
            for j in range(3):  # Colonnes (x)
                button_id = i * 3 + j
                # x = 50 + j*110 (colonne), y = 50 + i*110 (ligne)
                # On ajoute un espacement de 10px entre les boutons de 100px
                self.buttons.append(Button(button_id, 50 + j * 110, 50 + i * 110, 100, 100))

    def addView(self, view):
        self.views.append(view)

    def appliquerEffet(self,button):
        self.rule.apply(button)
        self.notifyViews()

    def notifyViews(self):
        for view in self.views:
            view.update()