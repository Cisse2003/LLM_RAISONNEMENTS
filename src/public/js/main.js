import { view } from './view.js';
import { historyView } from './historyView.js';
import { setupController } from './controller.js';

view.init();
historyView.init();
setupController();

fetch('/api/state')
    .then(res => res.json())
    .then(data => {
        view.render(data.buttons);
    });

historyView.update();

// Sélecteur de règles
const ruleSelect = document.getElementById('rule-select');

// Charger la liste des règles depuis le serveur
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
      });

      ruleSelect.appendChild(li);

      // On active automatiquement Test 1
      if (index === 0) {
        li.classList.add('active');
        li.click();
      }
    });

  } catch (err) {
    console.error("Impossible de charger les règles", err);
  }
}

// Initialiser la liste des règles
loadRules();

// Fermeture modale
document.getElementById('close-victory')?.addEventListener('click', () => {
  document.getElementById('victory-modal')?.classList.add('hidden');
});


const nextBtn = document.getElementById('next');

nextBtn.addEventListener('click', () => {
  const items = document.querySelectorAll('#rule-select li');
  const current = document.querySelector('#rule-select li.active');

  if (!items.length) return;

  let currentIndex = Array.from(items).indexOf(current);

  // Si aucun actif → sélectionner le premier
  if (currentIndex === -1) {
    items[0].click();
    return;
  }
  const nextIndex = (currentIndex + 1) % items.length;
  items[nextIndex].click();
});
