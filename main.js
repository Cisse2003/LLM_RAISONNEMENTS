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


  const validationPanel = document.getElementById('validation-panel');
  const validationQuestionText = document.getElementById('validation-question-text');
  const validationInitialGrid = document.getElementById('validation-initial-grid');
  const validationAnswerGrid = document.getElementById('validation-answer-grid');
  const validationClickInfo = document.getElementById('validation-click-info');
  const validationCheckBtn = document.getElementById('validation-check');
  const validationNextBtn = document.getElementById('validation-next');
  const validationCloseBtn = document.getElementById('validation-close');
  const validationFeedback = document.getElementById('validation-feedback');
  const validationSuccessModal = document.getElementById('validation-success-modal');

  let validationIndex = 0;
  let validationUserAnswer = Array(9).fill(0);

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
      model.addVictory();
      historyView.update();
      // Afficher ou masquer le bouton de validation selon le JSON
      const validationBtn = document.getElementById('start-validation');
      if (model.rule.hasValidation && !model.isValidation) {
        validationBtn?.classList.remove('hidden');
      } else {
        validationBtn?.classList.add('hidden');
      }
      victoryModal?.classList.remove('hidden');
    }
  }

  async function loadAndApplyRule(testNumber, difficulty = 'facile') {
    await model.setTest(testNumber, difficulty);           // attend le fetch
    view.render(model.getState());
    historyView.update();
    renderObjective(model.rule.description, model.rule.targetState);
    checkVictory();
  }

  function renderMiniGrid(container, state, clickable = false, onClick = null) {
    container.innerHTML = "";

    state.forEach((cell, i) => {
      const btn = document.createElement("button");
      btn.textContent = i + 1;

      if (cell) btn.classList.add("on");

      if (clickable && onClick) {
        btn.addEventListener("click", () => onClick(i));
      }

      container.appendChild(btn);
    });
  }
  function renderAnswerGrid() {
    renderMiniGrid(validationAnswerGrid, validationUserAnswer, true, (i) => {
      validationUserAnswer[i] = validationUserAnswer[i] ? 0 : 1;
      renderAnswerGrid();
    });
  }
  function openValidationQuestion() {
    const questions = model.rule.validationQuestions || [];
    const question = questions[validationIndex];
    if (!question) return;

    validationUserAnswer = Array(9).fill(0);
    validationFeedback.textContent = "";
    validationCheckBtn.classList.remove("hidden");
    validationNextBtn.classList.add("hidden");
    validationCloseBtn.classList.add("hidden");

    validationQuestionText.textContent = question.description;
    validationClickInfo.textContent = `On clique sur le bouton ${question.clickButton}`;

    renderMiniGrid(validationInitialGrid, question.initialState);
    renderAnswerGrid();

    validationPanel.classList.remove("hidden");
  }
  function arraysEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  function checkValidationAnswer() {
    const questions = model.rule.validationQuestions || [];
    const question = questions[validationIndex];
    if (!question) return;

    if (arraysEqual(validationUserAnswer, question.expectedState)) {
      validationFeedback.textContent = "Bonne réponse.";
      validationFeedback.style.color = "green";
      validationCheckBtn.classList.add("hidden");

      if (validationIndex < questions.length - 1) {
        validationNextBtn.classList.remove("hidden");
      } else {
        model.addValidationSuccess();
        historyView.update();

        validationPanel.classList.add('hidden');
        validationSuccessModal?.classList.remove('hidden');
      }
    } else {
      validationFeedback.textContent = "Ce n'est pas la bonne réponse.";
      validationFeedback.style.color = "red";
    }
  }

  // ───────────────────────────────────────────────
  // Chargement liste des tests
  // ───────────────────────────────────────────────
  async function loadRules() {
    const difficultyFolders = ['facile', 'moyen', 'difficile'];
    const possibleTests = [];

    for (const diff of difficultyFolders) {
      let i = 1;

      while (true) {
        try {
          const response = await fetch(`ressources/rules/${diff}/test${i}.json`);
          if (!response.ok) break;
          possibleTests.push({num: i, difficulty: diff });
          i++;
        } catch {
          break;
        }
      }
    }
    const difficultyOrder = ['facile', 'moyen', 'difficile'];
    const difficultyLabels = {
      'facile': { label: '🟢 Facile', color: '#22c55e' },
      'moyen': { label: '🟡 Moyen', color: '#f59e0b' },
      'difficile': { label: '🔴 Difficile', color: '#ef4444' },
    };

    // Grouper par difficulté
    ruleSelect.innerHTML = '';

    for (const diff of difficultyOrder) {
      const group = possibleTests.filter(t => t.difficulty === diff);
      if (group.length === 0) continue;

      // En-tête de groupe
      const header = document.createElement('li');
      header.classList.add('difficulty-header');
      header.textContent = difficultyLabels[diff]?.label || diff;
      header.style.color = difficultyLabels[diff]?.color || 'white';
      ruleSelect.appendChild(header);

      for (const test of group) {
        const li = document.createElement('li');
        li.textContent = `Test ${test.num}`;
        li.dataset.value = test.num;
        li.dataset.difficulty = test.difficulty; // ← ajouter cette ligne
        li.addEventListener('click', async () => {
          document.querySelectorAll('#rule-select li:not(.difficulty-header)').forEach(el => el.classList.remove('active'));
          li.classList.add('active');
          await loadAndApplyRule(test.num, test.difficulty);
        });
        ruleSelect.appendChild(li);
      }
    }

    // Charger le premier test automatiquement
    const first = ruleSelect.querySelector('li:not(.difficulty-header)');
    if (first) {
      first.classList.add('active');
      await loadAndApplyRule(parseInt(first.dataset.value, first.dataset.difficulty));
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

  // ───────────────────────────────────────────────
  // Filtrage par difficulté
  // ───────────────────────────────────────────────
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Mettre à jour le bouton actif
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      const items = document.querySelectorAll('#rule-select li:not(.difficulty-header)');
      const headers = document.querySelectorAll('#rule-select li.difficulty-header');

      items.forEach(li => {
        if (filter === 'all' || li.dataset.difficulty === filter) {
          li.style.display = '';
        } else {
          li.style.display = 'none';
        }
      });

      // Cacher les en-têtes de groupe si tous leurs tests sont cachés
      headers.forEach(header => {
        let next = header.nextElementSibling;
        let allHidden = true;
        while (next && !next.classList.contains('difficulty-header')) {
          if (next.style.display !== 'none') allHidden = false;
          next = next.nextElementSibling;
        }
        header.style.display = allHidden ? 'none' : '';
      });
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
  document.getElementById('start-validation')?.addEventListener('click', () => {
    victoryModal?.classList.add('hidden');
    validationIndex = 0;
    openValidationQuestion();
  });
  validationCheckBtn?.addEventListener('click', () => {
    checkValidationAnswer();
  });

  validationNextBtn?.addEventListener('click', () => {
    validationIndex++;
    openValidationQuestion();
  });

  validationCloseBtn?.addEventListener('click', () => {
    validationPanel.classList.add('hidden');
  });
  document.getElementById('close-validation-success')?.addEventListener('click', () => {
    validationSuccessModal?.classList.add('hidden');
  });
});