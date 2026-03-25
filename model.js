import { Rule } from './rules.js';

class Model {
    constructor() {
        this.buttons = Array(9).fill(false);
        this.actions = [];
        this.currentTest = 1;
        this.currentDifficulty = 'facile';
        this.isValidation = false;
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
    const diffLabel = this.currentDifficulty.charAt(0).toUpperCase() + this.currentDifficulty.slice(1);
    const testLabel = this.isValidation
        ? `Test${this.currentTest} Validation ${diffLabel}`
        : `Test${this.currentTest} ${diffLabel}`;

    this.actions.push({
        type: 'load',
        testLabel,
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

    addVictory() {
        this.actions.push({
            type: 'victory',
            timestamp: new Date().toLocaleTimeString(),
        });
    }
    addValidationSuccess() {
        this.actions.push({
            type: 'validation-success',
            timestamp: new Date().toLocaleTimeString(),
        });
    }
  // Maintenant async !
  async setTest(testNumber, difficulty = 'facile') {
    this.currentTest = testNumber;
    this.currentDifficulty = difficulty;
    this.isValidation = false;
    this.actions = [];
    this.rule = new Rule(this.currentTest, this.currentDifficulty,false);
    await this.rule.load();   // on attend le chargement
    this.reset();
  }

}

export const model = new Model();