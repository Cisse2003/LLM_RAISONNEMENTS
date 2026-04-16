// llmView.js
import { model } from './model.js';
import { historyView } from './historyView.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const llmView = {
    isOpen: false,
    conversationHistory: [],

    init() {
        const toggleBtn = document.getElementById('toggle-llm-btn');
        const btnDescription = document.getElementById('llm-btn-description');
        const btnEtape       = document.getElementById('llm-btn-etape');
        const modeSelect = document.getElementById('llm-mode');
        const valWrapper = document.getElementById('llm-btn-validation-wrapper');

        modeSelect?.addEventListener('change', () => this.updateModeUI());
        toggleBtn?.addEventListener('click', () => this.toggle());
        btnDescription?.addEventListener('click', () => this.sendDescription());
        btnEtape?.addEventListener('click',       () => this.sendEtape());
        valWrapper?.addEventListener('click', () => this.handleValidationCycle());

        this.updateModeUI();
    },

    toggle() {
        this.isOpen = !this.isOpen;
        const panelHistory = document.getElementById('panel-history');
        const panelLlm     = document.getElementById('panel-llm');
        const title        = document.getElementById('history-title');
        const icon         = document.getElementById('history-icon');
        const btn          = document.getElementById('toggle-llm-btn');

        if (this.isOpen) {
            panelHistory.classList.add('hidden');
            panelLlm.classList.remove('hidden');
            title.textContent = 'Assistant LLM';
            icon.textContent  = '';
            btn.title         = "Voir l'historique";
            btn.textContent   = '📜';
        } else {
            panelLlm.classList.add('hidden');
            panelHistory.classList.remove('hidden');
            title.textContent = 'Historique des actions';
            icon.textContent  = '📜';
            btn.title         = 'Tester avec le LLM';
            btn.textContent   = 'LLM';
        }
    },

    // ── Bouton 1 : Description ──────────────────────────────────────────────
    sendDescription() {
        // Réinitialise la conversation
        this.conversationHistory = [];
        const messagesContainer = document.getElementById('llm-messages');
        if (messagesContainer) messagesContainer.innerHTML = '';

        document.getElementById('reset')?.click();

        const target = model.rule?.targetState || Array(9).fill(0);
        const description = model.rule?.description || '';

        const text = `On va jouer à un jeu avec une grille de 9 boutons (3x3 : 1 2 3 / 4 5 6 / 7 8 9), tous éteints au départ : [□ □ □ □ □ □ □ □ □].
    Tu disposes également d'un bouton CLEAR qui éteint ([□ □ □ □ □ □ □ □ □]) tous les boutons instantanément sans compter comme une action.

    État cible à atteindre : [${target.map(v => v ? '■' : '□').join(' ')}]  
    Description de l'objectif : "${description}"
    
    Règles du jeu :
    - À chaque tour, indique-moi quel bouton tu appuies (1 à 9 ou RESET) et si tu penses avoir gagné.
    - Je te répondrai en indiquant quels boutons se sont allumés ou éteints.
    - Continue jusqu'à atteindre l'état cible.
    - Si tu connais la solution, donne-la directement ; sinon, propose un bouton à tester ensuite.`;

        // Enregistre dans l'historique du modèle
        model.globalActions.push({
            type: 'llm-description',
            timestamp: new Date().toLocaleTimeString(),
        });
        historyView.update();

        this._send(text);
    },

    async handleValidationCycle() {
        const questions = model.rule.validationQuestions;
        const btn = document.getElementById('llm-btn-validation-wrapper');

        if (this.validationStep === 0) {
            await this.startValidationFlow();
            this.validationStep = 1;
            this.correctAnswersCount = 0;
            btn.textContent = `Envoyer Question 1 / ${questions.length}`;
            btn.style.backgroundColor = "#28a745";
            return;
        }

        if (btn.textContent.includes("Envoyer")) {
            this.currentQuestion = questions[this.validationStep - 1];

            const initialStr = this.currentQuestion.initialState.map(v => v ? '■' : '□').join(' ');

            const qText = `QUESTION ${this.validationStep}: 
        État initial : [${initialStr}]
        Si on clique sur le bouton : ${this.currentQuestion.clickButton}
        Quel sera l'état final ? Réponds uniquement sous la forme [? ? ? ? ? ? ? ? ?]`;

            await this._send(qText);

            btn.textContent = `Vérifier Réponse ${this.validationStep}`;
            btn.style.backgroundColor = "#ffc107"; // Orange pendant l'attente de vérification
            return;
        }

        if (btn.textContent.includes("Vérifier")) {
            const lastReply = this.conversationHistory[this.conversationHistory.length - 1].content;


            const normalized = lastReply.replace(/■/g, '1').replace(/□/g, '0');
            const match = normalized.match(/\[([01,\s,]+)\]/);

            let isCorrect = false;
            if (match) {
                const llmAnswer = match[1].trim().split(/[\s,]+/).map(n => parseInt(n));
                const expected = this.currentQuestion.expectedState.map(v => v ? 1 : 0);
                isCorrect = JSON.stringify(llmAnswer) === JSON.stringify(expected);
            }

            if (isCorrect) this.correctAnswersCount++;

            const feedback = isCorrect ? "✅ CORRECT !" : "❌ INCORRECT.";
            this.appendMessage('user', feedback);
            this.conversationHistory.push({ role: 'user', content: feedback });

            if (this.validationStep < questions.length) {

                this.validationStep++;
                btn.textContent = `Envoyer Question ${this.validationStep} / ${questions.length}`;
                btn.style.backgroundColor = "#28a745";
            } else {

                const finalScore = this.correctAnswersCount;
                const total = questions.length;
                const scoreMsg = `Validation terminée ! Score final : ${finalScore} / ${total}`;

                this.appendMessage('assistant', scoreMsg);

                model.globalActions.push({
                    type: 'llm-validation-end',
                    timestamp: new Date().toLocaleTimeString(),
                    score: `${finalScore}/${total}`,
                    button: null,
                    stateBefore: [],
                    stateAfter: [],
                    result: finalScore === total ? 'RÉUSSIE' : 'ÉCHOUÉE'
                });

                historyView.update();

                btn.style.display = 'none';
                btn.textContent = "";

                this.validationStep = 0;
                this.currentQuestion = null;
                this.correctAnswersCount = 0;
            }
        }
    },

    sendEtape() {

        const btnValidation = document.getElementById('llm-btn-validation-wrapper');
        const lastReply = this.conversationHistory.length
            ? this.conversationHistory[this.conversationHistory.length - 1].content.trim().toLowerCase()
            : '';


        if (lastReply.includes('terminer')) {
            if (this.isTargetReached()) {

                if (btnValidation) {
                    btnValidation.style.display = 'block';
                    btnValidation.textContent = "🏁 Démarrer la validation";
                    btnValidation.style.backgroundColor = "#28a745";

                    this.validationStep = 0;
                }
            } else {
                const failText = `⚠️ L'objectif n'est pas encore atteint. 
            Regarde bien l'état cible. Continue à chercher ou utilise RESET si tu es bloqué.`;
                this._send(failText);
            }
            return;
        }

        const lastAction = [...model.globalActions]
            .reverse()
            .find(a => a.button !== undefined || a.type === 'clear' || a.type === 'load');

        let promptText;

        if (!lastAction) {
            promptText = `Aucune action effectuée sur la grille. Quel bouton souhaites-tu tester en premier ? (Réponds uniquement par un numéro 1-9, RESET ou "Terminer")`;
        }
        else if (lastAction.type === 'clear' || lastAction.type === 'load') {
            promptText = `L'état de la grille a été réinitialisé. Tous les boutons sont éteints : [□ □ □ □ □ □ □ □ □]. Quelle est ta prochaine action ?`;
        }
        else {

            const avant = lastAction.stateBefore.map(s => s ? '■' : '□').join(' ');
            const apres = lastAction.stateAfter.map(s => s ? '■' : '□').join(' ');

            promptText = `Bouton ${lastAction.button} cliqué.
        État avant : [${avant}]
        État après : [${apres}]
        Quelle est ta prochaine analyse ou action ?`;

        model.globalActions.push({
            type: 'llm-etape',
            timestamp: new Date().toLocaleTimeString(),
            actionRef: lastAction.button,
        });
        historyView.update();
        }

        this._send(promptText);
    },

    // ── Envoi commun ─────────────────────────────────────────────────────────
    async _send(text) {
        const apiKey  = document.getElementById('llm-api-key').value.trim();
        const modelId = document.getElementById('llm-model').value.trim() || 'openai/gpt-4o-mini';

        if (!apiKey) {
            this.appendMessage('error', '⚠ Entrez votre clé API OpenRouter pour continuer.');
            return;
        }

        this.appendMessage('user', text);
        this.conversationHistory.push({ role: 'user', content: text });

        const typingId = this.appendMessage('assistant', '…', true);

        try {
            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer':  window.location.href,
                    'X-Title':       'Reasoning Experiment',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: 'system', content: this.buildSystemPrompt() },
                        ...this.conversationHistory
                    ],
                    max_tokens: 400,
                    temperature: 0.7,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || `Erreur ${res.status}`);
            }

            const data  = await res.json();
            const reply = data.choices?.[0]?.message?.content || '(pas de réponse)';

            this.removeMessage(typingId);
            this.appendMessage('assistant', reply);
            this.conversationHistory.push({ role: 'assistant', content: reply });

        } catch (e) {
            this.removeMessage(typingId);
            this.appendMessage('error', '⚠ Erreur : ' + e.message);
        }
    },

    buildSystemPrompt() {
        return `Tu es un assistant d'analyse logique spécialisé dans les puzzles de boutons.
        - Il y a 9 boutons numérotés de 1 à 9 (3x3 : 1 2 3 / 4 5 6 / 7 8 9), chacun allumé (■) ou éteint (□).
        - Un bouton CLEAR remet tous les boutons à [□ □ □ □ □ □ □ □ □] instantanément sans compter comme action.
        
        IMPORTANT :
        - Tu ne dois répondre **que par le numéro du bouton à appuyer (1 à 9), RESET ou "Terminer" si l'objectif est atteint**.
        - Ne jamais ajouter d’explications, commentaires ou phrases supplémentaires.
        - **Exception :** uniquement si l'utilisateur te demande explicitement de lui donner la règle qui cachait les boutons, tu peux alors expliquer avec des phrases.
        - Si l'utilisateur te corrige ou te remet sur la bonne voie, continue simplement à suivre ces instructions.
        - Toujours répondre en français, de manière concise et directe, **une seule valeur par réponse**.`;
    },

    appendMessage(role, text, isTyping = false) {
        const container = document.getElementById('llm-messages');
        const div = document.createElement('div');
        const id  = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        div.id    = id;
        div.classList.add('llm-msg', `llm-msg-${role}`);
        if (isTyping) div.classList.add('llm-typing');
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return id;
    },

    removeMessage(id) {
        document.getElementById(id)?.remove();
    },
    isTargetReached() {
        const target = model.rule?.targetState || Array(9).fill(false);

        // Cherche la dernière action ayant un stateAfter
        for (let i = model.globalActions.length - 1; i >= 0; i--) {
            const action = model.globalActions[i];

            if (Array.isArray(action.stateAfter)) {
                const currentState = action.stateAfter;
                return currentState.every((v, idx) => v === target[idx]);
            }

            // Si l'action est "victory", on considère que la cible est atteinte
            if (action.type === 'victory') {
                return true;
            }
        }

        return false; // aucun état correspondant trouvé
    },

    updateModeUI() {
        const mode = document.getElementById('llm-mode')?.value;

        const autoControls = document.getElementById('auto-mode-controls');
        const btnDesc = document.getElementById('llm-btn-description');
        const btnEtape = document.getElementById('llm-btn-etape');

        if (mode === 'auto') {
            if (autoControls) autoControls.style.display = 'flex';
            if (btnDesc) btnDesc.style.display = 'none';
            if (btnEtape) btnEtape.style.display = 'none';
        } else {
            if (autoControls) autoControls.style.display = 'none';
            if (btnDesc) btnDesc.style.display = 'block';
            if (btnEtape) btnEtape.style.display = 'block';
        }
    },

    async startValidationFlow() {
        // On rappelle explicitement que la règle est la MÊME
        const introVal = "Bravo, tu as atteint l'objectif ! Tu as maintenant identifié la règle logique de ce test. " +
            "Passons à la phase de VALIDATION : je vais te donner des situations hypothétiques " +
            "et tu devras prédire le résultat en utilisant la MÊME RÈGLE que celle que tu viens de trouver. " +
            "C'est un test pour vérifier que ta compréhension de la règle est parfaite.";

        this.appendMessage('user', introVal);
        this.conversationHistory.push({ role: 'user', content: introVal });

        // Affichage de la modale de 3 secondes
        const modal = document.getElementById('auto-victory-modal');
        if (modal) {
            modal.innerHTML = `
            <div class="modal-content" style="border: 2px solid #28a745;">
                <h2>🎯 Analyse de la Règle</h2>
                <p>L'objectif est atteint. Le LLM va maintenant prouver qu'il a compris la logique.</p>
            </div>
        `;
            modal.classList.remove('hidden');
            await new Promise(r => setTimeout(r, 3000));
            modal.classList.add('hidden');
        }

        await model.setValidation();
    }
};