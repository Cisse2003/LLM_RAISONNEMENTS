//controller.js
import { view } from './view.js';
import { historyView } from './historyView.js';
import { model } from './model.js';

export function setupController() {
   // Fonction rafraîchissement + vérification victoire
  function refreshAndCheckVictory() {
    try {

      // Récupère l'état actuel
      const buttons = model.getState();
      view.render(buttons);

       // Met à jour historique
      historyView.update();

      // Récupère l'objectif du test courant
      const current = buttons.map(b => b ? 1 : 0);
      const target = model.rule?.targetState || Array(9).fill(0);

      if (JSON.stringify(current) === JSON.stringify(target)) {
        const modal = document.getElementById('victory-modal');
        if (modal) {
          modal.classList.remove('hidden');
        } else {
          console.error("Modale introuvable dans le DOM");
        }
      }
    } catch (err) {
      console.error("Erreur lors du refresh/victoire :", err);
    }
  }

  // Clic sur boutons grille
  document.querySelectorAll('.grid button').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id) - 1;
      model.toggle(id);
      refreshAndCheckVictory();
    });
  });

  // Bouton RESET
  document.getElementById('reset')?.addEventListener('click', () => {
    model.reset();
    historyView.updateClear();// ← appel direct
    //refreshAndCheckVictory();
  });

   // Bouton CLEAN
  document.getElementById('clean')?.addEventListener('click', () => {
    try {
      model.actions = [];              // ← on vide directement
      historyView.update();
    } catch (err) {
      console.error("Erreur nettoyage historique :", err);
    }
  });

   // Sélecteur règle
  document.getElementById('rule-select')?.addEventListener('change', (e) => {
    const ruleId = parseInt(e.target.value);
    if (!isNaN(ruleId)) {
      model.setTest(ruleId);
      refreshAndCheckVictory();
    }
  });

}