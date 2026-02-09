import { model } from './model.js';
import { view } from './view.js';
import { historyView } from './historyView.js';
import { setupController } from './controller.js';

// Initialisation
view.init();
historyView.init();
model.initRule();
model.loadExternalObjectives()
setupController();

// Premier rendu
view.render();
historyView.update();
model.updateSidebar();

document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('close-victory')?.addEventListener('click', () => {
    const modal = document.getElementById('victory-modal');
    if (modal) modal.classList.add('hidden');
  });

  document.getElementById('victory-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.add('hidden');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('victory-modal')?.classList.add('hidden');
    }
  });
});

// Recharge les règles depuis localStorage
window.addEventListener('rulesUpdated', () => {

  const saved = localStorage.getItem('customRules');
  if (saved) {
    try {
      const data = JSON.parse(saved);

      data.tests.forEach(t => {
        model.objectives[t.id] = {
          description: t.name || `Test ${t.id}`,
          targetState: Array(9).fill(0)
        };
      });
      model.updateSidebar();
      model.updateObjectiveDisplay();
      alert("Règles mises à jour ! Actualise les tests.");
    } catch (e) {
      console.error("Erreur parsing règles :", e);
    }
  }
});