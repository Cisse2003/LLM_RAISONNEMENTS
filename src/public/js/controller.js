// Gestion des événements

import { model } from './model.js';
import { view } from './view.js';
import { historyView } from './historyView.js';

export function setupController() {
  // Clics sur les boutons de la grille
  document.querySelectorAll('.grid button').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id) - 1;
      model.toggle(id);
      view.render();
      historyView.update();
    });
  });

  // Bouton reset
  document.getElementById('reset').addEventListener('click', () => {
    model.reset();
    view.render();
    historyView.update();
  });

  // Bouton Clean (efface historique seulement)
  document.getElementById('clean').addEventListener('click', () => {
    historyView.clear();
  });

  // Bouton next
  document.getElementById('next').addEventListener('click', () => {
    model.nextTest();
    view.render();
    historyView.update();
    alert(`Passage au Test ${model.currentTest} – Nouvelle règle cachée active !`);
  });
}