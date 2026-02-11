const fs = require('fs');
const path = require('path');

class Rule {
    constructor(testNumber = 1) {
        this.testNumber = testNumber;

        // Charger le JSON correspondant au test
        const jsonPath = path.join(__dirname, '../ressources/rules', `regle${testNumber}.json`);
        const rulesData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        // Créer une fonction toggle dynamique à partir du JSON
        this.setToggleFunction(rulesData.rule);
    }

    apply(clickedIndex, model) {
        // Appeler la fonction toggle avec le contexte du model
        this.toggle(clickedIndex, model);
    }

    setToggleFunction(ruleArray) {
        // ruleArray est un tableau de chaînes JS
        this.toggle = (clickedIndex, model) => {
            ruleArray.forEach(ruleCode => {
                // "model" devient le contexte de "this" dans eval
                const fn = new Function('index', 'model', `
                    with(model) {
                        ${ruleCode};
                    }
                `);
                fn(clickedIndex, model);
            });
        };

    }
}

module.exports = { Rule };
