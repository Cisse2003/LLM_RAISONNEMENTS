import { model } from './model.js';
import { view } from './view.js';
import { historyView } from './historyView.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const autoMode = {
    running: false,
    _timeoutId: null,
    conversationHistory: [],
    MAX_STEPS: 30, // sécurité anti-boucle infinie
    stepCount: 0,
    isValidationPhase: false,
    currentValidationIndex: 0,
    validationScore: 0,

    init() {
        this._injectUI();
        this._bindEvents();
    },

    _injectUI() {
        const actionsRow = document.getElementById('llm-actions-row');
        if (!actionsRow) return;

        const wrapper = document.createElement('div');
        wrapper.style.display = 'none';
        wrapper.id = 'auto-mode-controls';
        wrapper.innerHTML = `
            <div id="auto-mode-row">
                <button id="llm-btn-auto" title="Lancer le mode automatique">▶ Auto</button>
                <button id="llm-btn-stop" title="Arrêter le mode automatique" disabled>■ Stop</button>
            </div>
            <div id="auto-delay-row">
                <label for="auto-delay-slider">Délai entre actions :</label>
                <input type="range" id="auto-delay-slider" min="1" max="10" value="3" step="1" />
                <span id="auto-delay-value">3s</span>
            </div>
            <div id="auto-status"></div>
        `;
        actionsRow.after(wrapper);

        // Injection de la modale spécifique au mode Auto
        const autoModal = document.createElement('div');
        autoModal.id = 'auto-victory-modal';
        autoModal.className = 'modal hidden'; // On réutilise la classe modal existante
        autoModal.innerHTML = `
        <div class="modal-content" style="border: 2px solid #007bff;">
            <h2>🎯 Objectif Atteint !</h2>
            <p id="auto-victory-text"></p>
            <div style="margin-top: 15px; font-style: italic; color: #666;">
                Démarrage de la validation dans 3s...
            </div>
        </div>
    `;
        document.body.appendChild(autoModal);
    },

    _bindEvents() {
        document.getElementById('llm-btn-auto')?.addEventListener('click', () => this.start());
        document.getElementById('llm-btn-stop')?.addEventListener('click', () => this.stop('Arrêté par l\'utilisateur.'));

        const slider = document.getElementById('auto-delay-slider');
        const label  = document.getElementById('auto-delay-value');
        slider?.addEventListener('input', () => {
            label.textContent = `${slider.value}s`;
        });
    },

    _getDelay() {
        const slider = document.getElementById('auto-delay-slider');
        return parseInt(slider?.value || '3') * 1000;
    },

    _setStatus(text, type = 'info') {
        const el = document.getElementById('auto-status');
        if (el) {
            el.textContent = text;
            el.className = `auto-status-${type}`;
        }
    },

    _setRunning(running) {
        this.running = running;
        const btnAuto = document.getElementById('llm-btn-auto');
        const btnStop = document.getElementById('llm-btn-stop');
        const slider  = document.getElementById('auto-delay-slider');

        if (btnAuto)  btnAuto.disabled  = running;
        if (btnStop)  btnStop.disabled  = !running;
        if (slider)   slider.disabled   = running;
    },

    async start() {
        const mode = document.getElementById('llm-mode')?.value;
        if (mode !== 'auto') {
            this._setStatus('⚠️ Passe en mode automatique pour lancer.', 'error');
            return;
        }

        const apiKey = document.getElementById('llm-api-key')?.value.trim();
        if (!apiKey) {
            this._setStatus('🔑 Entrez votre clé API OpenRouter.', 'error');
            return;
        }

        this.conversationHistory = [];
        this.stepCount = 0;
        this.isValidationPhase = false;
        this._setRunning(true);

        const messagesContainer = document.getElementById('llm-messages');
        if (messagesContainer) messagesContainer.innerHTML = '';
        document.getElementById('reset')?.click();

        model.globalActions.push({
            type: 'auto-start',
            timestamp: new Date().toLocaleTimeString(),
        });
        historyView.update();

        const target = model.rule?.targetState || Array(9).fill(0);
        const description = model.rule?.description || '';

        const initText = `On va jouer à un jeu avec une grille de 9 boutons (3x3 : 1 2 3 / 4 5 6 / 7 8 9), tous éteints au départ : [□ □ □ □ □ □ □ □ □].
    Tu disposes également d'un bouton CLEAR qui éteint ([□ □ □ □ □ □ □ □ □]) tous les boutons instantanément sans compter comme une action.

    État cible à atteindre : [${target.map(v => v ? '■' : '□').join(' ')}]  
    Description de l'objectif : "${description}"
    
    Règles du jeu :
    - À chaque tour, indique-moi quel bouton tu appuies (1 à 9 ou RESET) et si tu penses avoir gagné.
    - Je te répondrai en indiquant quels boutons se sont allumés ou éteints.
    - Continue jusqu'à atteindre l'état cible.
    - Si tu connais la solution, donne-la directement ; sinon, propose un bouton à tester ensuite.`;

        this._appendMessage('user', initText);
        this.conversationHistory.push({ role: 'user', content: initText });

        this._setStatus('🤖 Le LLM analyse le problème…', 'running');
        await this._step();
    },

    async _step() {
        if (!this.running) return;

        if (this.isValidationPhase) {
            await this._handleValidationStep();
            return;
        }

        if (this.stepCount >= this.MAX_STEPS) {
            this.stop(`Limite de ${this.MAX_STEPS} actions atteinte.`);
            return;
        }

        this.stepCount++;
        const apiKey  = document.getElementById('llm-api-key')?.value.trim();
        const modelId = document.getElementById('llm-model')?.value.trim() || 'openai/gpt-4o-mini';

        const typingId = this._appendMessage('assistant', '...', true);

        try {
            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        { role: 'system', content: this._buildSystemPrompt() },
                        ...this.conversationHistory,
                    ],
                    max_tokens: 300,
                    temperature: 0.3,
                }),
            });

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content?.trim() || '';

            this._removeMessage(typingId);
            this._appendMessage('assistant', reply);
            this.conversationHistory.push({ role: 'assistant', content: reply });

            model.globalActions.push({
                type: 'llm-auto-reply',
                reply,
                timestamp: new Date().toLocaleTimeString(),
            });
            historyView.update();

            const parsed = this._parseReply(reply);

            if (!parsed) {
                // Réponse incompréhensible → on redemande
                const clarif = 'Je n\'ai pas compris. Réponds uniquement avec ACTION: N, SOLUTION: N1 N2 …, CLEAR ou ABANDON: raison.';
                this.conversationHistory.push({ role: 'user', content: clarif });
                this._appendMessage('user', clarif);
                this._scheduleNext();
                return;
            }

            if (parsed.type === 'abandon') {
                this.stop(`🏳️ LLM abandonne : ${parsed.reason}`);
                model.globalActions.push({
                    type: 'llm-abandon',
                    reason: parsed.reason,
                    timestamp: new Date().toLocaleTimeString(),
                });
                historyView.update();
                return;
            }

            if (parsed.type === 'clear') {
                document.getElementById('reset')?.click();
                const feedback = 'CLEAR effectué. État : [□ □ □ □ □ □ □ □ □]. Instruction suivante ?';
                this.conversationHistory.push({ role: 'user', content: feedback });
                this._appendMessage('user', feedback);
                this._scheduleNext();
                return;
            }

            if (parsed.type === 'solution') {
                await this._playSolution(parsed.buttons);
                return;
            }

            if (parsed.type === 'action') {
                await this._clickButton(parsed.button);
                if (this._isVictory()) {
                    this._setStatus('🎉 Objectif atteint ! Passage à la validation...', 'success');
                    model.addVictory();
                    historyView.update();

                    // On bloque la modale manuelle si le controller l'a ouverte
                    document.getElementById('victory-modal')?.classList.add('hidden');

                    const msg = "Bravo, tu as atteint l'objectif. Passons à la phase de VALIDATION pour prouver que tu as compris la règle. Je vais te donner des situations hypothétiques.";

                    await this._showAutoVictoryModal(msg);
                    await this._startValidationPhase();
                } else {
                    const state = model.getState();
                    const stateStr = state.map(s => s ? '■' : '□').join(' ');
                    const feedback = `Bouton ${parsed.button} cliqué. État actuel : [${stateStr}]. Instruction suivante ?`;
                    this.conversationHistory.push({ role: 'user', content: feedback });
                    this._appendMessage('user', feedback);

                    this._scheduleNext();
                }
            }

        } catch (e) {
            this._removeMessage(typingId);
            this._appendMessage('error', '⚠ Erreur : ' + e.message);
            this.stop('Erreur réseau ou API.');
        }
    },

    async _startValidationPhase() {
        this.isValidationPhase = true;
        this.currentValidationIndex = 0;
        this.validationScore = 0;

        await model.setValidation();

        const introVal = "Bravo, tu as atteint l'objectif. Passons à la phase de VALIDATION pour prouver que tu as compris la règle. Je vais te donner des situations hypothétiques.";
        this._appendMessage('user', introVal);
        this.conversationHistory.push({ role: 'user', content: introVal });

        this._scheduleNext();
    },

    async _handleValidationStep() {
        const questions = model.rule.validationQuestions;
        let finalFeedback = "";

        if (this.currentValidationIndex >= questions.length) {
            // Si le score est égal au nombre de questions, c'est un succès total
            const isAllCorrect = (this.validationScore === questions.length);

            if (isAllCorrect) {
                this._setStatus('🎉 Validation réussie !', 'success');
                finalFeedback = `Félicitations ! Tu as répondu correctement à toutes les questions (${this.validationScore}/${questions.length}). 
                                    Tu as prouvé ta compréhension de la règle. Fin du test.`;
                model.globalActions.push({
                    type: 'validation-success',
                    timestamp: new Date().toLocaleTimeString()
                });
            } else {
                this._setStatus('❌ Validation échouée.', 'error');
                finalFeedback = `Le test de validation est terminé. Tu as obtenu un score de ${this.validationScore}/${questions.length}. 
                                    C'est insuffisant pour confirmer la compréhension de la règle. Fin du test.`;
                model.globalActions.push({
                    type: 'validation-failure',
                    timestamp: new Date().toLocaleTimeString()
                });
            }

            this._appendMessage('user', finalFeedback);
            this.conversationHistory.push({ role: 'user', content: finalFeedback });

            historyView.update();

            this.stop(isAllCorrect ? 'Validation réussie !' : 'Validation échouée.');
            return;
        }

        const q = questions[this.currentValidationIndex];
        const questionText = `QUESTION ${this.currentValidationIndex + 1}: 
        État initial : [${q.initialState.map(v => v ? '■' : '□').join(' ')}]
        Si on clique sur le bouton : ${q.clickButton}
        Quel sera l'état final ? 
        Réponds UNIQUEMENT sous la forme d'un tableau de 9 chiffres : [□ ■ □ ...]`;

        this._appendMessage('user', questionText);
        this.conversationHistory.push({ role: 'user', content: questionText });

        const apiKey = document.getElementById('llm-api-key')?.value.trim();
        const modelId = document.getElementById('llm-model')?.value.trim();

        try {
            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: modelId,
                    messages: [...this.conversationHistory],
                    temperature: 0.1
                }),
            });
            const data = await res.json();
            const reply = data.choices[0].message.content;

            this._appendMessage('assistant', reply);
            this.conversationHistory.push({ role: 'assistant', content: reply });

            const normalizedReply = reply.replace(/■/g, '1').replace(/□/g, '0');
            const match = normalizedReply.match(/\[([01,\s,]+)\]/);

            if (match) {
                const llmAnswer = match[1].trim().split(/[\s,]+/).map(n => parseInt(n));

                if (llmAnswer.length === 9) {
                    const isCorrect = JSON.stringify(llmAnswer) === JSON.stringify(q.expectedState);

                    if (isCorrect) {
                        this.validationScore++; // On incrémente notre compteur interne
                    }

                    model.addValidationQuestionResult(this.currentValidationIndex, isCorrect);

                    const feedback = isCorrect ? "✅ CORRECT !" : `❌ INCORRECT.`;
                    this._appendMessage('user', feedback);
                    this.conversationHistory.push({ role: 'user', content: feedback });
                }
            } else {
                model.globalActions.push({
                    type: 'validation-question',
                    questionIndex: this.currentValidationIndex + 1,
                    status: '⚠️ FORMAT INCORRECT',
                    timestamp: new Date().toLocaleTimeString()
                });
                this._appendMessage('user', "Format non reconnu.");
            }

            historyView.update();
            this.currentValidationIndex++;
            this._scheduleNext();

        } catch (e) {
            console.error(e);
            this.stop('Erreur phase validation');
        }
    },

    _sendFeedback(text) {
        this.conversationHistory.push({ role: 'user', content: text });
        this._appendMessage('user', text);
        this._scheduleNext();
    },

    _scheduleNext() {
        if (!this.running) return;
        this._setStatus(`⏳ Prochaine action dans ${document.getElementById('auto-delay-slider')?.value || 3}s…`, 'running');
        this._timeoutId = setTimeout(() => this._step(), this._getDelay());
    },

    async _clickButton(buttonNumber) {
        const index = buttonNumber - 1;
        model.toggle(index);
        view.render(model.getState());
        historyView.update();
        await this._wait(500);
    },

    async _playSolution(buttons) {
        this._setStatus(`🚀 Exécution de la solution...`, 'running');

        for (const btn of buttons) {
            if (!this.running) return;
            if (btn < 1 || btn > 9) continue;

            await this._clickButton(btn);

            if (this._isVictory()) {
                model.addVictory();
                historyView.update();

                document.getElementById('victory-modal')?.classList.add('hidden');

                const msg = "Bravo, tu as atteint l'objectif. Passons à la phase de VALIDATION...";
                await this._showAutoVictoryModal(msg);
                await this._startValidationPhase();
                return;
            }
            await this._wait(this._getDelay());
        }
        this._sendFeedback("Séquence terminée, mais pas de victoire. Que fais-tu ?");
    },

    _isVictory() {
        const current = model.getState().map(b => b ? 1 : 0);
        const target  = model.rule?.targetState || Array(9).fill(0);
        return JSON.stringify(current) === JSON.stringify(target);
    },

    stop(reason = 'Arrêté.') {
        this.running = false;
        if (this._timeoutId) clearTimeout(this._timeoutId);
        this._setRunning(false);
        this._setStatus(`🛑 ${reason}`, 'stopped');
    },

    _parseReply(text) {
        const upper = text.toUpperCase();
        if (text.match(/ABANDON/i)) return { type: 'abandon', reason: text };
        if (/\bCLEAR\b/.test(upper)) return { type: 'clear' };
        const solMatch = text.match(/SOLUTION\s*[:\-]\s*([\d\s]+)/i);
        if (solMatch) {
            const buttons = solMatch[1].trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 9);
            return { type: 'solution', buttons };
        }
        const actionMatch = text.match(/ACTION\s*[:\-]\s*(\d)/i);
        if (actionMatch) return { type: 'action', button: parseInt(actionMatch[1]) };
        const loose = text.match(/\b([1-9])\b/);
        if (loose) return { type: 'action', button: parseInt(loose[1]) };
        return null;
    },

    _buildSystemPrompt() {
        return `Tu es un agent autonome qui joue à un jeu de logique.
Tu interagis avec une grille de 9 boutons (3×3 : 1 2 3 / 4 5 6 / 7 8 9).
Chaque bouton peut être allumé (■) ou éteint (□).
Cliquer sur un bouton modifie certains boutons selon une règle fixe inconnue.
CLEAR remet tout à zéro sans compter comme une action.

Ton objectif : atteindre l'état cible décrit dans le premier message.

Règles de réponse STRICTES — réponds UNIQUEMENT avec l'un de ces formats :
- Pour cliquer un bouton : ACTION: N  (ex: ACTION: 5)
- Quand tu as la solution complète : SOLUTION: N1 N2 N3  (ex: SOLUTION: 3 7 2)
- Pour remettre à zéro : CLEAR
- Si tu abandonnes (trop difficile ou trop long) : ABANDON: raison

N'écris rien d'autre que ces commandes. Pas d'explication, pas de texte supplémentaire.
Si tu n'es pas encore sûr, teste un bouton avec ACTION: N pour recueillir plus d'informations.
Tu peux faire jusqu'à ${this.MAX_STEPS} actions au total.
Une fois l'objectif atteint, tu devras passer un test de compréhension.`;
    },

    _appendMessage(role, text, isTyping = false) {
        const container = document.getElementById('llm-messages');
        if (!container) return null;
        const div = document.createElement('div');
        const id = 'msg-' + Math.random().toString(36).slice(2);
        div.id = id;
        div.className = `llm-msg llm-msg-${role} ${isTyping ? 'llm-typing' : ''}`;
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return id;
    },

    _removeMessage(id) {
        if (id) document.getElementById(id)?.remove();
    },

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    async _showAutoVictoryModal(message) {
        const modal = document.getElementById('auto-victory-modal');
        const textEl = document.getElementById('auto-victory-text');
        if (modal && textEl) {
            textEl.textContent = message;
            modal.classList.remove('hidden');

            // Attente de 3 secondes
            await this._wait(3000);

            modal.classList.add('hidden');
        }
    },
};