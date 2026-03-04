export class Rule {
  constructor(testNumber = 1) {
    this.testNumber = testNumber;
    this.description = "Objectif non défini";
    this.targetState = Array(9).fill(0);
    this.ruleCode = [];
  }

  // Méthode async pour charger les données
  async load() {
    const jsonPath = `ressources/rules/test${this.testNumber}.json`;
    try {
      const response = await fetch(jsonPath);
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status} pour ${jsonPath}`);
      }
      const data = await response.json();

      this.description  = data.description  || this.description;
      this.targetState  = data.targetState  || this.targetState;
      this.ruleCode     = data.rule         || this.ruleCode;

      console.log(`Règle test ${this.testNumber} chargée avec succès`);
    } catch (err) {
      console.error(`Impossible de charger ${jsonPath}`, err);
    }
  }

  apply(clickedIndex, model) {
    this.ruleCode.forEach(code => {
      try {
        const fn = new Function('index', 'buttons', 'actions', code);
        fn(clickedIndex, model.buttons, model.actions);
      } catch (e) {
        console.error(`Erreur dans la règle du test ${this.testNumber}:`, e);
      }
    });
  }
}