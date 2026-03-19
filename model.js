import { Rule } from './rules.js';

class Model {
  constructor() {
    this.buttons = Array(9).fill(false);
    this.actions = [];
    this.currentTest = 1;
    this.rule = new Rule(this.currentTest);
    this.historiques = [];
  }

  toggle(index) {
    const action = {
      button: index + 1,
      timestamp: new Date().toLocaleTimeString(),
      stateBefore: [...this.buttons],
      stateAfter: null,
    };

    // Appliquer la règle
    this.rule.apply(index, this);

    action.stateAfter = [...this.buttons];
    this.actions.push(action);
    this.historiques.push(action);
    console.log(this.buttons)
  }

  reset() {
    this.actions.push({
        type: 'clear',
        button: null,
        timestamp: new Date().toLocaleTimeString(),
        stateBefore: [...this.buttons],
        stateAfter: Array(9).fill(false)
    });
    this.historiques = [];
    this.buttons.fill(false);
  }

  getState() {
    return this.buttons;
  }

  getActions() {
    return this.actions;
  }
  getHistoriques  () {
    return this.historiques;
  }
  // Maintenant async !
  async setTest(testNumber, difficulty = 'facile') {
    this.currentTest = testNumber;
    this.currentDifficulty = difficulty;
    this.actions = [];
    this.rule = new Rule(this.currentTest, this.currentDifficulty);
    await this.rule.load();   // on attend le chargement
    this.reset();
  }
}

export const model = new Model();