const { Rule } = require('./rules.js');

class Model {
  constructor() {
    this.buttons = Array(9).fill(false);
    this.actions = [];
    this.currentTest = 1;
    this.rule = new Rule(this.currentTest);
  }

  toggle(index) {
    const action = {
      button: index + 1,
      timestamp: new Date().toLocaleTimeString(),
      stateBefore: [...this.buttons],
      stateAfter: null
    };

    // Appliquer la règle
    this.rule.apply(index, this);

    action.stateAfter = [...this.buttons];
    this.actions.push(action);
  }

  reset() {
    this.buttons.fill(false);
    this.actions = [];
  }

  getState() {
    return this.buttons;
  }

  getActions() {
    return this.actions;
  }

  setTest(testNumber) {
    this.currentTest = testNumber;
    this.rule = new Rule(this.currentTest);
    this.reset();
  }
}

module.exports = new Model();