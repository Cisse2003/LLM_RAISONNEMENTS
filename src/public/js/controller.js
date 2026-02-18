import { view } from "./view.js";
import { historyView } from "./historyView.js";

export function setupController() {
  // Fonction rafraîchissement + vérification victoire
  async function refreshAndCheckVictory() {
    try {

      // Récupère l'état actuel
      const stateRes = await fetch('/api/state');
      const stateData = await stateRes.json();
      view.render(stateData.buttons);

      // Met à jour historique
      await historyView.update();
      // Récupère l'objectif du test courant
      const objRes = await fetch('/api/current-objective');
      const objData = await objRes.json();

      const current = stateData.buttons.map(b => b ? 1 : 0);

      // Vérifie si objectif atteint → affiche la fenêtre
     if (JSON.stringify(current) === JSON.stringify(objData.targetState)) {
       const modal = document.getElementById('victory-modal');
       if (modal) {
         modal.classList.remove('hidden');
       } else {
         console.error("Modale introuvable dans le DOM");
       }
     }
    } catch (err) {
      console.error("Erreur refresh/victoire :", err);
    }
  }

  // Clic sur boutons grille
  document.querySelectorAll('.grid button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id) - 1;
      await fetch(`/api/toggle/${id}`, { method: 'POST' });
      await refreshAndCheckVictory();
    });
  });

  // Bouton RESET
  document.getElementById('reset')?.addEventListener('click', async () => {
    await fetch('/api/reset', { method: 'POST' });
    await refreshAndCheckVictory();
  });

  // Sélecteur règle
  document.getElementById('rule-select')?.addEventListener('change', async (e) => {
    const ruleId = e.target.value;
    await fetch(`/api/rule/${ruleId}`, { method: 'POST' });
    await refreshAndCheckVictory();
  });

  // Bouton CLEAN
  document.getElementById('clean')?.addEventListener('click', async () => {
    try {
      await fetch('/api/clean', { method: 'POST' });

      await historyView.update();
    } catch (err) {
      console.error("Erreur nettoyage historique :", err);
    }
  });

}