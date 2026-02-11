import { view } from './view.js';
import { historyView } from './historyView.js';
import { setupController } from './controller.js';

view.init();
historyView.init();      // ✅ Initialisation de l'historique
setupController();

// Charger état initial des boutons
fetch('/api/state')
    .then(res => res.json())
    .then(data => {
        view.render(data.buttons);
    });

// Charger état initial de l'historique
historyView.update();    // ✅ Affiche l'historique au chargement

// Sélecteur de règles
const ruleSelect = document.getElementById('rule-select');

// Charger la liste des règles depuis le serveur
async function loadRules() {
  try {
    const response = await fetch('/api/rules');
    const data = await response.json();

    ruleSelect.innerHTML = ''; // vider la liste
    data.rules.forEach(num => {
      const option = document.createElement('option');
      option.value = num;
      option.textContent = `Règle ${num}`;
      ruleSelect.appendChild(option);
    });
  } catch (err) {
    console.error("Impossible de charger les règles", err);
  }
}

// Quand l'utilisateur change de règle
ruleSelect.addEventListener('change', async (e) => {
  const ruleId = e.target.value;
  if (!ruleId) return;

  const response = await fetch(`/api/rule/${ruleId}`, { method: 'POST' });
  const data = await response.json();

  view.render(data.buttons);
  await historyView.update();
});

// Initialiser la liste des règles
loadRules();
