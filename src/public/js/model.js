// État global + historique

import { Rule } from './rules.js';

export const model = {
  buttons: Array(9).fill(false),      // false = éteint, true = allumé
  actions: [],                        // historique des cliques
  currentTest: 1,
  rule: null,                         // instance de rule

  // Initialise la règle
  initRule() {
    this.rule = new Rule(this.currentTest);

    // On donne à la Rule la fonction qui modifie réellement l'état
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
  },

  // Pour debug ou export
  getCurrentState() {
    return [...this.buttons];
  }
};