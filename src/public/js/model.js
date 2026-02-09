// État global + historique

import { Rule } from './rules.js';
import { view } from './view.js';
import { historyView } from './historyView.js';

export const model = {
  buttons: Array(9).fill(false),      // false = éteint, true = allumé
  actions: [],                        // historique des cliques
  currentTest: 1,
  rule: null,                         // instance de rule


// Objectifs par test (test 1 codé en dur, les autres seront chargés)
  objectives: {
    1: {
      description: "Allumer uniquement le bouton 9",
      targetState: [0,0,0, 0,0,0, 0,0,1]
    }
  },

  // Initialise la règle
  initRule() {
   this.rule = new Rule(this.currentTest);
       this.rule.setToggleFunction((index) => {
         this.buttons[index] = !this.buttons[index];
       });
  },

  // Appelée quand on clique sur un bouton
  toggle(index) {
    this.actions.push({
      button: index + 1,
      timestamp: new Date().toLocaleTimeString(),
      stateBefore: [...this.buttons],
      stateAfter: null
    });

    // On délègue tout à la règle
    if (this.rule) {
      this.rule.apply(index);
    }

    // On met à jour l'historique avec l'état final
    const lastAction = this.actions[this.actions.length - 1];
    if (lastAction) {
      lastAction.stateAfter = [...this.buttons];
    }

    this.checkVictory();
  },

  checkVictory() {
      const obj = this.objectives[this.currentTest];
      if (!obj) return;

      const current = this.buttons.map(b => b ? 1 : 0);
      if (JSON.stringify(current) === JSON.stringify(obj.targetState)) {
        view.render();
        historyView.update();
        this.showVictoryModal();
      }
  },

  showVictoryModal() {
      const modal = document.getElementById('victory-modal');
      if (modal) {
        modal.classList.remove('hidden');
      }
  },

  // Réinitialise tout
  reset() {
    this.buttons.fill(false);
    this.actions = [];
  },

  // Passe au test suivant + réinitialise
  nextTest() {
    this.currentTest = (this.currentTest % 4) + 1;
    this.rule = new Rule(this.currentTest);

    this.rule.setToggleFunction((index) => {
      this.buttons[index] = !this.buttons[index];
    });

    this.reset();
    this.updateObjectiveDisplay();
    this.updateSidebar();
  },

  updateObjectiveDisplay() {
    const numEl = document.getElementById('current-test-num');
    const descEl = document.getElementById('objective-desc');

    if (numEl && descEl) {
      numEl.textContent = this.currentTest;

      const obj = this.objectives[this.currentTest];
      if (obj) {
        descEl.textContent = obj.description;
      } else {
        descEl.textContent = "Objectif en cours de chargement...";
      }
    }
  },

  // Pour debug ou export
  getCurrentState() {
    return [...this.buttons];
  },

  // Pour charger les objectifs
  async loadExternalObjectives() {
    try{
      const test2 = await import('../rules/test2.js');
      const test3 = await import('../rules/test3.js');
      const test4 = await import('../rules/test4.js');

      this.objectives[2] = test2.objective2;
      this.objectives[3] = test3.objective3;
      this.objectives[4] = test2.objective4;


      this.updateObjectiveDisplay();
      this.updateSidebar();
    } catch(err){
        console.error("Erreur chargement règles externes :", err);
        this.updateObjectiveDisplay();
    }
  },


  updateSidebar() {
    const list = document.getElementById('test-list');
    if (!list) return;

    list.innerHTML = '';

    Object.keys(this.objectives).forEach(testNum => {
      const li = document.createElement('li');
      li.textContent = `Test ${testNum}`;
      li.dataset.test = testNum;

      if (parseInt(testNum) === this.currentTest) {
        li.classList.add('active');
      }

      li.addEventListener('click', () => {
        this.switchToTest(parseInt(testNum));
      });

      list.appendChild(li);
    });
  },

  switchToTest(testNum) {
    if (!this.objectives[testNum]) return;
    this.currentTest = testNum;
    this.rule = new Rule(this.currentTest);
    this.rule.setToggleFunction((index) => {
      this.buttons[index] = !this.buttons[index];
    });
    this.reset();
    this.updateObjectiveDisplay();
    this.updateSidebar();
  }

};