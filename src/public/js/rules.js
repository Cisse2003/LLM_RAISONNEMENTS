// Gestion des règles cachées
// Règle de base = toggle UNIQUEMENT le bouton cliqué

export class Rule {
  constructor(testNumber = 1) {
    this.testNumber = testNumber;
  }

  // Méthode principale appelée à chaque clique
  apply(clickedIndex) {
    this.toggle(clickedIndex);

    // Ici tu pourras ajouter plus tard les règles cachées par test
  }

  toggle(index) {
    console.warn("Méthode toggle non surchargée dans Rule");
  }

  setToggleFunction(toggleFn) {
    this.toggle = toggleFn;
  }
}
