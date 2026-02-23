import { model } from './model.js';
import { view } from './view.js';
import { historyView } from './historyView.js';

document.addEventListener("DOMContentLoaded", async () => {
  view.init();
  historyView.init();

  const ruleSelect = document.getElementById('rule-select');
  const objectiveDesc = document.getElementById('objective-description');
  const objectiveGrid = document.getElementById('objective-grid');
  const victoryModal = document.getElementById('victory-modal');

  // ───────────────────────────────────────────────
  // Fonctions utilitaires
  // ───────────────────────────────────────────────
  function renderObjective(description, targetState) {
    objectiveDesc.textContent = description || "";
    objectiveGrid.innerHTML = "";
    targetState.forEach((state, i) => {
      const btn = document.createElement("button");
      btn.textContent = i + 1;
      if (state === 1) btn.classList.add("on");
      objectiveGrid.appendChild(btn);
    });
  }

  function checkVictory() {
    const current = model.getState().map(b => b ? 1 : 0);
    const target = model.rule.targetState;
    if (JSON.stringify(current) === JSON.stringify(target)) {
      victoryModal?.classList.remove('hidden');
    }
  }

  async function loadAndApplyRule(testNumber) {
    await model.setTest(testNumber);           // attend le fetch
    view.render(model.getState());
    historyView.update();
    renderObjective(model.rule.description, model.rule.targetState);
    checkVictory();
  }

  // ───────────────────────────────────────────────
  // Chargement liste des tests
  // ───────────────────────────────────────────────
  async function loadRules() {
    const possibleTests = [];
    for (let i = 1; i <= 20; i++) {
      try {
        const response = await fetch(`ressources/rules/test${i}.json`);
        if (response.ok) possibleTests.push(i);
      } catch {
        // silencieux
      }
    }

    ruleSelect.innerHTML = '';
    for (let index = 0; index < possibleTests.length; index++) {
      const num = possibleTests[index];
      const li = document.createElement('li');
      li.textContent = `Test ${num}`;
      li.dataset.value = num;
      li.addEventListener('click', async () => {
        document.querySelectorAll('#rule-select li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        await loadAndApplyRule(num);
      });
      ruleSelect.appendChild(li);

      if (index === 0) {
        li.classList.add('active');
        await loadAndApplyRule(num);   // premier test chargé
      }
    }
  }

  await loadRules();

  // ───────────────────────────────────────────────
  // Événements grille
  // ───────────────────────────────────────────────
  document.querySelectorAll('.grid button').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id) - 1;
      model.toggle(id);
      view.render(model.getState());
      historyView.update();
      checkVictory();
    });
  });

  document.getElementById('reset')?.addEventListener('click', () => {
    model.reset();
    view.render(model.getState());
    historyView.update();
  });

  document.getElementById('clean')?.addEventListener('click', () => {
    model.actions = [];
    historyView.update();
  });

  document.getElementById('next')?.addEventListener('click', () => {
    const items = document.querySelectorAll('#rule-select li');
    const current = document.querySelector('#rule-select li.active');
    if (!items.length) return;
    let idx = Array.from(items).indexOf(current);
    if (idx === -1) idx = 0;
    const nextIdx = (idx + 1) % items.length;
    items[nextIdx].click();
  });

  document.getElementById('close-victory')?.addEventListener('click', () => {
    victoryModal?.classList.add('hidden');
  });
});