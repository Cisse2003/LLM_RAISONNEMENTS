/**
 * prompts.js — Textes centralisés envoyés au LLM via OpenRouter
 *
 * Modifier ici pour ajuster les instructions sans toucher à la logique.
 * Toutes les fonctions reçoivent un objet de paramètres pour l'interpolation.
 */

export const prompts = {

    // ─────────────────────────────────────────────────────────────────────────
    // SYSTEM PROMPTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Prompt système commun (autoMode et llmView en mode manuel).
     * @param {{ maxSteps: number }} p
     */
    systemAuto: ({ maxSteps }) =>
        `Tu es un agent autonome qui joue à un jeu de logique.
Tu interagis avec une grille de 9 boutons (3×3 : 1 2 3 / 4 5 6 / 7 8 9).
Chaque bouton peut être allumé (■) ou éteint (□).
Cliquer sur un bouton modifie certains boutons selon une règle fixe inconnue.
CLEAR remet tout à zéro sans compter comme une action.

Ton objectif : atteindre l'état cible décrit dans le premier message.

Règles de réponse STRICTES - réponds UNIQUEMENT avec l'un de ces formats :
- Pour cliquer un bouton : ACTION: N  (ex: ACTION: 5)
- Quand tu as la solution complète : SOLUTION: N1 N2 N3  (ex: SOLUTION: 3 7 2)
- Pour remettre à zéro : CLEAR
- Si tu abandonnes (trop difficile ou trop long) : ABANDON: raison

N'écris rien d'autre que ces commandes. Pas d'explication, pas de texte supplémentaire.
Si tu n'es pas encore sûr, teste un bouton avec ACTION: N pour recueillir plus d'informations.
Tu peux faire jusqu'à ${maxSteps} actions au total.
Une fois l'objectif atteint, tu devras passer un test de compréhension.
Exception : si l'utilisateur te demande d'expliquer la règle identifiée, réponds avec une phrase descriptive complète en français.`,

    /**
     * Prompt système pour le mode manuel (llmView).
     */
    systemManual: () =>
        `Tu es un assistant d'analyse logique spécialisé dans les puzzles de boutons.
- Il y a 9 boutons numérotés de 1 à 9 (3x3 : 1 2 3 / 4 5 6 / 7 8 9), chacun allumé (■) ou éteint (□).
- Un bouton CLEAR remet tous les boutons à [□ □ □ □ □ □ □ □ □] instantanément sans compter comme action.

IMPORTANT :
- Tu ne dois répondre **que par le numéro du bouton à appuyer (1 à 9), RESET ou "Terminer" si l'objectif est atteint**.
- Ne jamais ajouter d'explications, commentaires ou phrases supplémentaires.
- **Exception :** uniquement si l'utilisateur te demande explicitement de lui donner la règle qui cachait les boutons, tu peux alors expliquer avec des phrases.
- Si l'utilisateur te corrige ou te remet sur la bonne voie, continue simplement à suivre ces instructions.
- Toujours répondre en français, de manière concise et directe, **une seule valeur par réponse**.`,


    // ─────────────────────────────────────────────────────────────────────────
    // MESSAGES UTILISATEUR — INITIALISATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Premier message envoyé au LLM pour démarrer une partie.
     * @param {{ target: number[], description: string }} p
     */
    initGame: ({ target, description }) => {
        const targetStr = target.map(v => v ? '■' : '□').join(' ');
        return `On va jouer à un jeu avec une grille de 9 boutons (3x3 : 1 2 3 / 4 5 6 / 7 8 9), tous éteints au départ : [□ □ □ □ □ □ □ □ □].
Tu disposes également d'un bouton CLEAR qui éteint ([□ □ □ □ □ □ □ □ □]) tous les boutons instantanément sans compter comme une action.

État cible à atteindre : [${targetStr}]  
Description de l'objectif : "${description}"

Règles du jeu :
- À chaque tour, indique-moi quel bouton tu appuies (1 à 9 ou RESET) et si tu penses avoir gagné.
- Je te répondrai en indiquant quels boutons se sont allumés ou éteints.
- Continue jusqu'à atteindre l'état cible.
- Si tu connais la solution, donne-la directement ; sinon, propose un bouton à tester ensuite.`;
    },


    // ─────────────────────────────────────────────────────────────────────────
    // MESSAGES UTILISATEUR — FEEDBACK EN COURS DE PARTIE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Feedback après un clic sur un bouton.
     * @param {{ button: number, state: number[] }} p
     */
    feedbackClick: ({ button, state }) => {
        const stateStr = state.map(s => s ? '■' : '□').join(' ');
        return `Bouton ${button} cliqué. État actuel : [${stateStr}]. Instruction suivante ?`;
    },

    /**
     * Feedback après un CLEAR.
     */
    feedbackClear: () =>
        `CLEAR effectué. État : [□ □ □ □ □ □ □ □ □]. Instruction suivante ?`,

    /**
     * Message envoyé quand la réponse du LLM est incompréhensible.
     */
    clarificationRequest: () =>
        `Je n'ai pas compris. Réponds uniquement avec ACTION: N, SOLUTION: N1 N2 …, CLEAR ou ABANDON: raison.`,

    /**
     * Message quand une séquence SOLUTION s'est terminée sans victoire.
     */
    solutionFailed: () =>
        `Séquence terminée, mais pas de victoire. Que fais-tu ?`,

    /**
     * Feedback en mode manuel quand une action a été effectuée.
     * @param {{ button: number, stateBefore: boolean[], stateAfter: boolean[] }} p
     */
    feedbackEtape: ({ button, stateBefore, stateAfter }) => {
        const avant = stateBefore.map(s => s ? '■' : '□').join(' ');
        const apres = stateAfter.map(s => s ? '■' : '□').join(' ');
        return `Bouton ${button} cliqué.
État avant : [${avant}]
État après : [${apres}]
Quelle est ta prochaine analyse ou action ?`;
    },

    /**
     * Message en mode manuel quand la grille a été réinitialisée.
     */
    feedbackReset: () =>
        `L'état de la grille a été réinitialisé. Tous les boutons sont éteints : [□ □ □ □ □ □ □ □ □]. Quelle est ta prochaine action ?`,

    /**
     * Message en mode manuel quand aucune action n'a encore été effectuée.
     */
    feedbackNoAction: () =>
        `Aucune action effectuée sur la grille. Quel bouton souhaites-tu tester en premier ? (Réponds uniquement par un numéro 1-9, RESET ou "Terminer")`,

    /**
     * Message en mode manuel quand l'objectif n'est pas encore atteint mais le LLM dit "Terminer".
     */
    notYetReached: () =>
        `⚠️ L'objectif n'est pas encore atteint. 
Regarde bien l'état cible. Continue à chercher ou utilise RESET si tu es bloqué.`,

    /**
     * Message en mode manuel quand l'objectif est atteint — demande d'explication de la règle.
     */
    askRuleManual: () =>
        `Objectif atteint ! Explique en une phrase la règle que tu as identifiée : quel(s) bouton(s) chaque clic affecte-t-il ?`,


    // ─────────────────────────────────────────────────────────────────────────
    // MESSAGES UTILISATEUR — EXPLICATION DE LA RÈGLE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Demande d'explication de la règle identifiée (mode auto).
     */
    askRuleAuto: () =>
        `Objectif atteint ! Avant de continuer, explique en une phrase la règle que tu as identifiée.`,


    // ─────────────────────────────────────────────────────────────────────────
    // MESSAGES UTILISATEUR — PHASE DE VALIDATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Introduction à la phase de validation (mode auto).
     */
    validationIntroAuto: () =>
        `OK. Passons donc à la phase de VALIDATION pour prouver que tu as compris la règle. Pour cela, Je vais te donner des situations hypothétiques.`,

    /**
     * Introduction à la phase de validation (mode manuel).
     */
    validationIntroManual: () =>
        `Bravo, tu as atteint l'objectif ! Tu as maintenant identifié la règle logique de ce test. ` +
        `Passons à la phase de VALIDATION : je vais te donner des situations hypothétiques ` +
        `et tu devras prédire le résultat en utilisant la MÊME RÈGLE que celle que tu viens de trouver. ` +
        `C'est un test pour vérifier que ta compréhension de la règle est parfaite.`,

    /**
     * Message affiché dans la modale de victoire du mode auto avant la validation.
     */
    autoVictoryModal: () =>
        `Bravo, tu as atteint l'objectif. Passons à la phase de VALIDATION...`,

    /**
     * Message affiché dans la modale de victoire (mode auto, après _step).
     */
    autoVictoryModalStep: () =>
        `Passons à la phase de VALIDATION pour prouver que tu as compris la règle. Je vais te donner des situations hypothétiques.`,

    /**
     * Une question de validation.
     * @param {{ index: number, initialState: number[], clickButton: number }} p
     */
    validationQuestion: ({ index, initialState, clickButton }) => {
        const initialStr = initialState.map(v => v ? '■' : '□').join(' ');
        return `QUESTION ${index}: 
État initial : [${initialStr}]
Si on clique sur le bouton : ${clickButton}
Quel sera l'état final ? 
Réponds UNIQUEMENT sous la forme d'un tableau de 9 chiffres : [□ ■ □ ...]`;
    },

    /**
     * Feedback après une réponse correcte à une question de validation.
     */
    validationCorrect: () => `✅ CORRECT !`,

    /**
     * Feedback après une réponse incorrecte à une question de validation.
     */
    validationIncorrect: () => `❌ INCORRECT.`,

    /**
     * Message quand le format de réponse de validation est non reconnu.
     */
    validationFormatError: () => `Format non reconnu.`,

    /**
     * Message de fin de validation — succès.
     * @param {{ score: number, total: number }} p
     */
    validationSuccess: ({ score, total }) =>
        `Félicitations ! Tu as répondu correctement à toutes les questions (${score}/${total}). 
Tu as prouvé ta compréhension de la règle. Fin du test.`,

    /**
     * Message de fin de validation — échec.
     * @param {{ score: number, total: number }} p
     */
    validationFailure: ({ score, total }) =>
        `Le test de validation est terminé. Tu as obtenu un score de ${score}/${total}. 
C'est insuffisant pour confirmer la compréhension de la règle. Fin du test.`,

    /**
     * Score final affiché dans le chat (mode manuel).
     * @param {{ score: number, total: number }} p
     */
    validationFinalScore: ({ score, total }) =>
        `Validation terminée ! Score final : ${score} / ${total}`,
};