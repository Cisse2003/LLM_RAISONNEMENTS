//rules.js
export class Rule {
  constructor(testNumber = 1, difficulty = 'facile', isValidation = false) {
    this.testNumber = testNumber;
    this.description = "Objectif non défini";
    this.difficulty = difficulty;
    this.isValidation = isValidation;
    this.targetState = Array(9).fill(0);
    this.ruleCode = [];
    this.hasValidation = false;
    this.validationQuestions = [];
  }

  // Méthode async pour charger les données
  async load() {
    const jsonPath = `ressources/rules/${this.difficulty}/test${this.testNumber}.json`;
    try {
      const response = await fetch(jsonPath);
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status} pour ${jsonPath}`);
      }
      const data = await response.json();

      this.ruleCode = data.rule || this.ruleCode;
      this.description = data.description || this.description;
      this.targetState = data.targetState || this.targetState;
      this.validationQuestions = data.validationQuestions || [];
      this.hasValidation = this.validationQuestions.length > 0;

      console.log(`Règle test ${this.testNumber} (${this.isValidation ? 'validation' : 'normal'}) chargée avec succès`);
    } catch (err) {
      console.error(`Impossible de charger ${jsonPath}`, err);
    }
  }

  apply(clickedIndex, model) {

    try {
        const code = this.ruleCode.join("\n");
        const fn = new Function('index', 'buttons', 'historiques', code);
        fn(clickedIndex, model.buttons, model.historiques);
      } catch (e) {
        console.error(`Erreur dans la règle du test ${this.testNumber}:`, e);
      }
    }
}