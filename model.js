//model.js
import { Rule } from './rules.js';



class Model {
    constructor() {
        this.buttons = Array(9).fill(false);
        this.actions = [];
        this.globalActions = []; // toute la session, jamais vidé
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
    this.globalActions.push(action); // ajout session globale
    this.historiques.push(action);
    console.log(this.buttons)
  }

  reset() {
    const diffLabel = this.currentDifficulty.charAt(0).toUpperCase() + this.currentDifficulty.slice(1);
    const testLabel = this.isValidation
        ? `Test${this.currentTest} Validation ${diffLabel}`
        : `Test${this.currentTest} ${diffLabel}`;

    const loadAction = {
        type: 'load',
        testLabel,
        timestamp: new Date().toLocaleTimeString(),
        stateBefore: [...this.buttons],
        stateAfter: Array(9).fill(false)
    };
    this.actions.push(loadAction);
    this.globalActions.push(loadAction); // ajout session globale
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
        const victoryAction = {
            type: 'victory',
            timestamp: new Date().toLocaleTimeString(),
        };
        this.actions.push(victoryAction);
        this.globalActions.push(victoryAction); // ajout session globale
    }
    addComment(commentText) {
        const action = {
            type: 'comment',
            text: commentText,
            timestamp: new Date().toLocaleTimeString(),
        };

        this.actions.push(action);
        this.globalActions.push(action);
    }
    addValidationSuccess() {
        const validationAction = {
            type: 'validation-success',
            timestamp: new Date().toLocaleTimeString(),
        };

        this.actions.push(validationAction);
        this.globalActions.push(validationAction);
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
  exportJSON() {
    return {
      exportedAt: new Date().toLocaleString(),
      actions: this.globalActions // toute la session
    };
  }

    async setValidation() {
        this.isValidation = true;
        this.actions = [];
        this.validationResults = [];
        this.validationAllCorrect = true;
        this.rule = new Rule(this.currentTest, this.currentDifficulty, true);
        await this.rule.load();
        this.reset();
    }
    addValidationQuestionResult(questionIndex, isCorrect) {
        const action = {
            type: 'validation-question',
            questionIndex: questionIndex + 1,
            status: isCorrect ? 'correcte' : 'incorrecte',
            timestamp: new Date().toLocaleTimeString(),
        };

        this.validationResults.push(isCorrect);
        this.validationAllCorrect = isCorrect;

        this.actions.push(action);
        this.globalActions.push(action);
    }

    addValidationFailure() {
        const action = {
            type: 'validation-failure',
            timestamp: new Date().toLocaleTimeString(),
        };

        this.actions.push(action);
        this.globalActions.push(action);
    }
    addValidationAbandon() {
        const action = {
            type: 'validation-abandon',
            timestamp: new Date().toLocaleTimeString(),
        };

        this.actions.push(action);
        this.globalActions.push(action);
    }
}

export const model = new Model();