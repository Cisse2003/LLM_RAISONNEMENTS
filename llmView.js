// llmView.js
import { model } from './model.js';
import { historyView } from './historyView.js';
import { view } from './view.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const llmView = {
    isOpen: false,
    conversationHistory: [],

    mode: 'semi',
    autoRunning: false,
    autoPaused: false,
    autoStepCount: 0,
    autoMaxSteps: 15,
    manualTakenOver: false,
    lastAutoMessage: null,

    init() {
        const toggleBtn = document.getElementById('toggle-llm-btn');
        const btnDescription = document.getElementById('llm-btn-description');
        const btnEtape = document.getElementById('llm-btn-etape');
        const modeSelect = document.getElementById('llm-mode-select');
        const autoManual = document.getElementById('llm-auto-manual');
        const manualSend = document.getElementById('llm-manual-send');
        const autoStart = document.getElementById('llm-auto-start');
        const autoPause = document.getElementById('llm-auto-pause');
        const autoStop = document.getElementById('llm-auto-stop');


        toggleBtn?.addEventListener('click', () => this.toggle());
        btnDescription?.addEventListener('click', () => this.sendDescription());
        btnEtape?.addEventListener('click', () => this.sendEtape());
        autoManual?.addEventListener('click', () => this.takeManualControl());
        manualSend?.addEventListener('click', () => this.sendManualMessage());
        autoStart?.addEventListener('click', () => this.startAutoMode());
        autoPause?.addEventListener('click', () => this.togglePauseResume());
        autoStop?.addEventListener('click', () => this.stopAutoMode());

        modeSelect?.addEventListener('change', (e) => {
            this.mode = e.target.value;
            this.updateModeUI();
        });

        this.updateModeUI();
    },
    updateModeUI() {
        const semi = document.getElementById('llm-actions-semi');
        const auto = document.getElementById('llm-actions-auto');
        const manual = document.getElementById('llm-manual-row');

        semi?.classList.add('hidden');
        auto?.classList.add('hidden');
        manual?.classList.add('hidden');

        if (this.mode === 'semi') {
            semi?.classList.remove('hidden');
        }

        if (this.mode === 'auto') {
            auto?.classList.remove('hidden');
        }

        if (this.mode === 'auto' && this.manualTakenOver) {
            manual?.classList.remove('hidden');
        }
    },
    takeManualControl() {
        this.manualTakenOver = true;
        this.autoPaused = true;
        this.updateModeUI();
        this.appendMessage('assistant', '✍ Vous avez pris la main sur la discussion.');
    },
    sendManualMessage() {
        const input = document.getElementById('llm-manual-input');
        const text = input?.value.trim();

        if (!text) return;

        this._send(text);
        input.value = '';
    },
    buildAutoIntroMessage() {
        const target = model.rule?.targetState || Array(9).fill(0);
        const description = model.rule?.description || '';

        return `Tu participes à une expérience de raisonnement logique.

        Le jeu :
        - Il y a 9 boutons disposés en grille 3×3 :
          1 2 3
          4 5 6
          7 8 9
        - Chaque bouton peut être allumé (■) ou éteint (□).
        - Au départ, tous les boutons sont éteints : [□ □ □ □ □ □ □ □ □].
        - Quand on clique sur un bouton, une règle cachée modifie l’état d’un ou plusieurs boutons.
        - Il existe aussi une action CLEAR qui remet instantanément tous les boutons à [□ □ □ □ □ □ □ □ □].
        - Ton objectif est de découvrir la règle et d’atteindre l’état cible.
        
        État cible :
        [${target.map(v => v ? '■' : '□').join(' ')}]
        
        Description de l’objectif :
        "${description}"
        
        Consignes de réponse :
        - Réponds uniquement avec un objet JSON valide.
        - N’écris aucun texte avant ou après.
        - Si tu veux tester un bouton : {"action":"test","button":1}
        - Si tu penses avoir trouvé une solution finale : {"action":"solve","sequence":[1,2,3]}
        - Si tu veux arrêter : {"action":"stop","reason":"..."}
        
        Commence par proposer un premier test.`;
    },
    buildAutoSystemPrompt() {
        return `Tu es un assistant d'analyse logique.
        Tu participes à une expérience sur une grille de 9 boutons.
        En mode automatique, tu dois répondre uniquement avec un JSON valide.
        
        Formats autorisés :
        {"action":"test","button":1}
        {"action":"solve","sequence":[1,2,3]}
        {"action":"stop","reason":"..."}
        
        Règles :
        - Aucune phrase hors JSON
        - Aucun markdown
        - Aucun commentaire
        - Le champ "button" doit être un entier entre 1 et 9
        - Le champ "sequence" doit être un tableau d'entiers entre 1 et 9`;
    },
    async startAutoMode() {
        this.autoRunning = true;
        this.autoPaused = false;
        this.manualTakenOver = false;
        this.autoStepCount = 0;
        this.conversationHistory = [];

        const autoPauseBtn = document.getElementById('llm-auto-pause');
        if (autoPauseBtn) autoPauseBtn.textContent = '⏸ Pause';

        const messagesContainer = document.getElementById('llm-messages');
        if (messagesContainer) messagesContainer.innerHTML = '';

        document.getElementById('reset')?.click();
        this.updateModeUI();

        const intro = this.buildAutoIntroMessage();
        await this.runAutoLoop(intro);
    },
    parseAutoReply(reply) {
        try {
            return JSON.parse(reply);
        } catch (e) {
            return null;
        }
    },
    async _sendAuto(text) {
        const apiKey  = document.getElementById('llm-api-key').value.trim();
        const modelId = document.getElementById('llm-model').value.trim() || 'openai/gpt-4o-mini';

        if (!apiKey) {
            this.appendMessage('error', '⚠ Entrez votre clé API OpenRouter pour continuer.');
            return null;
        }

        this.appendMessage('user', text);
        this.conversationHistory.push({ role: 'user', content: text });

        const typingId = this.appendMessage('assistant', '…', true);

        try {
            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Reasoning Experiment',
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: 'system', content: this.buildAutoSystemPrompt() },
                        ...this.conversationHistory
                    ],
                    max_tokens: 400,
                    temperature: 0.2,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || `Erreur ${res.status}`);
            }

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || '(pas de réponse)';

            this.removeMessage(typingId);
            this.appendMessage('assistant', reply);
            this.conversationHistory.push({ role: 'assistant', content: reply });

            return reply;

        } catch (e) {
            this.removeMessage(typingId);
            this.appendMessage('error', '⚠ Erreur : ' + e.message);
            return null;
        }
    },
    async runAutoLoop(nextMessage) {
        while (

            this.autoRunning &&
            !this.autoPaused &&
            !this.manualTakenOver &&
            this.autoStepCount < this.autoMaxSteps
            ) {
            this.lastAutoMessage = nextMessage;
            const reply = await this._sendAuto(nextMessage);
            const parsed = this.parseAutoReply(reply);

            if (!parsed) {
                this.appendMessage('error', '⚠ Réponse JSON invalide.');
                this.autoRunning = false;
                return;
            }

            if (parsed.action === 'test' && Number.isInteger(parsed.button) && parsed.button >= 1 && parsed.button <= 9) {
                const before = [...model.getState()];

                model.toggle(parsed.button - 1);
                view.render(model.getState());
                historyView.update();

                const after = [...model.getState()];
                this.autoStepCount++;

                this.appendMessage('assistant', `✅ Bouton ${parsed.button} testé automatiquement.`);

                nextMessage = this.buildAutoObservationMessage(parsed.button, before, after);
                continue;
            }

            if (parsed.action === 'solve' && Array.isArray(parsed.sequence)) {
                this.appendMessage('assistant', `Solution proposée : ${JSON.stringify(parsed.sequence)}`);
                this.autoRunning = false;
                return;
            }

            if (parsed.action === 'stop') {
                this.appendMessage('assistant', `Arrêt demandé : ${parsed.reason || 'sans raison'}`);
                this.autoRunning = false;
                return;
            }

            this.appendMessage('error', '⚠ Format JSON non reconnu.');
            this.autoRunning = false;
            return;
        }

        if (this.autoStepCount >= this.autoMaxSteps) {
            this.appendMessage('assistant', `⛔ Limite atteinte : ${this.autoMaxSteps} étapes automatiques.`);
            this.autoRunning = false;
        }
    },
    buildAutoObservationMessage(button, before, after) {
        return `Observation après test :

        Bouton testé : ${button}
        Avant : [${before.map(s => s ? '■' : '□').join(' ')}]
        Après : [${after.map(s => s ? '■' : '□').join(' ')}]
        
        Réponds uniquement avec un JSON valide.
        
        Formats autorisés :
        {"action":"test","button":1}
        {"action":"solve","sequence":[1,2,3]}
        {"action":"stop","reason":"..."}`;
    },
    pauseAutoMode() {
        this.autoPaused = true;
        this.appendMessage('assistant', '⏸ Mode automatique en pause.');
    },

    stopAutoMode() {
        this.autoRunning = false;
        this.autoPaused = false;
        this.manualTakenOver = false;
        this.updateModeUI();
        this.appendMessage('assistant', '■ Mode automatique arrêté.');
    },
    async togglePauseResume() {
        const autoPauseBtn = document.getElementById('llm-auto-pause');

        if (!this.autoPaused) {
            this.autoPaused = true;
            if (autoPauseBtn) autoPauseBtn.textContent = '▶ Reprendre';
            this.appendMessage('assistant', '⏸ Mode automatique en pause.');
            return;
        }

        if (!this.lastAutoMessage) {
            this.appendMessage('error', '⚠ Aucun contexte à reprendre.');
            return;
        }

        this.autoRunning = true;
        this.autoPaused = false;
        this.manualTakenOver = false;

        if (autoPauseBtn) autoPauseBtn.textContent = '⏸ Pause';

        this.appendMessage('assistant', '▶ Reprise du mode automatique.');
        await this.runAutoLoop(this.lastAutoMessage);
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

        const text = `Grille de 9 boutons (3×3 : 1 2 3 / 4 5 6 / 7 8 9), tous éteints au départ : [□ □ □ □ □ □ □ □ □].
    Quand je clique sur un bouton, une règle cachée modifie l'état d'un ou plusieurs boutons.
    Je dispose aussi d'un bouton CLEAR qui remet instantanément tous les boutons à [□ □ □ □ □ □ □ □ □] sans compter comme une action.
    État cible à atteindre : [${target.map(v => v ? '■' : '□').join(' ')}].
    Description de l'objectif : "${description}".
    Je vais te décrire mes actions une par une. Donne-moi la solution dès que tu la connais, sinon dis-moi quel bouton tester ensuite.`;

        // Enregistre dans l'historique du modèle
        model.globalActions.push({
            type: 'llm-description',
            timestamp: new Date().toLocaleTimeString(),
        });
        historyView.update();

        this._send(text);
    },

    // ── Bouton 2 : Étape ────────────────────────────────────────────────────
    sendEtape() {
        // Trouve la dernière action significative (bouton cliqué OU clear)
        const lastAction = [...model.globalActions]
            .reverse()
            .find(a => a.button !== undefined || a.type === 'clear' || a.type === 'load');

        let text;
        if (!lastAction || (!(lastAction.type === 'clear' || lastAction.type === 'load') && !lastAction.button === undefined)) {
            text = `Aucune action effectuée. Rappel : je peux utiliser CLEAR à tout moment pour remettre tous les boutons à zéro. Quel bouton tester en premier ?`;
        } else if (lastAction.type === 'clear' || lastAction.type === 'load') {
            text = `J'ai utilisé CLEAR : tous les boutons sont maintenant éteints [□ □ □ □ □ □ □ □ □].
            Tu connais la solution ? Si oui, donne-la. Sinon, quel bouton tester ensuite ?`;
        } else {
            const avant = lastAction.stateBefore.map(s => s ? '■' : '□').join(' ');
            const apres = lastAction.stateAfter.map(s => s ? '■' : '□').join(' ');
            text = `Bouton ${lastAction.button} cliqué.
            Avant : [${avant}]
            Après : [${apres}]
            Tu connais la solution ? Si oui, donne-la. Sinon, quel bouton tester ensuite ?`;
            model.globalActions.push({
                type: 'llm-etape',
                timestamp: new Date().toLocaleTimeString(),
                actionRef: lastAction?.button ??  null,
            });
            historyView.update();
        }
        this._send(text);

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
        return `Tu es un assistant d'analyse logique.
L'utilisateur interagit avec une grille de 9 boutons numérotés de 1 à 9 (disposés en 3×3 : 1 2 3 / 4 5 6 / 7 8 9).
Chaque bouton peut être allumé (■) ou éteint (□).
Cliquer sur un bouton modifie l'état de certains boutons selon une règle fixe.
Je dispose aussi d'un bouton CLEAR qui remet instantanément tous les boutons à [□ □ □ □ □ □ □ □ □] sans compter comme une action.

Ton rôle :
- Analyser chaque action (bouton cliqué → changement d'état observé) pour comprendre le mécanisme
- Déduire le plus vite possible la séquence exacte de boutons à cliquer pour atteindre l'état cible
- Dès que tu as la solution, donner directement la liste ordonnée des boutons à cliquer
- Si tu n'as pas encore assez de données, indiquer précisément quel bouton tester ensuite pour maximiser l'information
- Répondre en français, de manière courte et directe`;
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
};