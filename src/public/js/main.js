import { view } from './view.js';
import { historyView } from './historyView.js';
import { setupController } from './controller.js';

document.addEventListener("DOMContentLoaded", async () => {

  view.init();
  historyView.init();
  setupController();

  const ruleSelect = document.getElementById('rule-select');
  const nextBtn = document.getElementById('next');

  //  Fonction pour charger l’objectif
  async function loadObjective() {
    const objRes = await fetch('/api/current-objective');
    const objData = await objRes.json();

    // Description
    const desc = document.getElementById("objective-description");
    if (desc) {
      desc.textContent = objData.description || "";
    }

    // Grille objectif
    const grid = document.getElementById("objective-grid");
    if (grid) {
      grid.innerHTML = "";

      objData.targetState.forEach((state, index) => {
        const btn = document.createElement("button");
        btn.textContent = index + 1;
        if (state === 1) btn.classList.add("on");
        grid.appendChild(btn);
      });
    }
  }

  //  Charger l’état initial
  const stateRes = await fetch('/api/state');
  const stateData = await stateRes.json();
  view.render(stateData.buttons);

  await historyView.update();
  await loadObjective();

  //  Charger les règles
  async function loadRules() {
    try {
      const response = await fetch('/api/rules');
      const data = await response.json();

      ruleSelect.innerHTML = '';

      data.rules.forEach((num, index) => {
        const li = document.createElement('li');
        li.textContent = `Test ${num}`;
        li.dataset.value = num;

        li.addEventListener('click', async () => {

          document.querySelectorAll('#rule-select li')
              .forEach(el => el.classList.remove('active'));

          li.classList.add('active');

          const response = await fetch(`/api/rule/${num}`, { method: 'POST' });
          const data = await response.json();

          view.render(data.buttons);
          await historyView.update();
          await loadObjective();
        });

        ruleSelect.appendChild(li);

        // Activer automatiquement le premier test
        if (index === 0) {
          li.classList.add('active');
          li.click();
        }
      });

    } catch (err) {
      console.error("Impossible de charger les règles", err);
    }
  }

  await loadRules();

  //  Bouton NEXT
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const items = document.querySelectorAll('#rule-select li');
      const current = document.querySelector('#rule-select li.active');

      if (!items.length) return;

      let currentIndex = Array.from(items).indexOf(current);

      if (currentIndex === -1) {
        items[0].click();
        return;
      }

      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex].click();
    });
  }

  //  Fermeture modale
  document.getElementById('close-victory')?.addEventListener('click', () => {
    document.getElementById('victory-modal')?.classList.add('hidden');
  });

});
