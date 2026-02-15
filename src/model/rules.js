const fs = require('fs');
const path = require('path');

class Rule {
  constructor(testNumber = 1) {
    this.testNumber = testNumber;

    // Charger le JSON correspondant au test
    const jsonPath = path.join(__dirname, '../ressources/rules', `test${testNumber}.json`);

    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(raw);

      this.description = data.description || "Objectif non défini";
      this.targetState = data.targetState || Array(9).fill(0);
      this.ruleCode = data.rule || []; // tableau de code JS

      console.log(`Test ${testNumber} chargée : ${jsonPath}`);
    } catch (err) {
      console.error(`Erreur lecture test{testNumber}.json`, err);
      this.description = "Erreur de chargement";
      this.targetState = Array(9).fill(0);
      this.ruleCode = [];
    }
  }

  apply(clickedIndex, model) {
    this.ruleCode.forEach(code => {
      try {
        // Exécute chaque ligne de code avec index et buttons disponibles
        new Function('index', 'buttons', code)(clickedIndex, model.buttons);
      } catch (e) {
        console.error("Erreur exécution test :", e);
      }
    });
  }
}

module.exports = { Rule };