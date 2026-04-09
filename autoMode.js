// autoMode.js
// Mode automatique : le LLM joue seul, bouton par bouton, avec délai configurable.

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

    init() {
        this._injectUI();
        this._bindEvents();
    },

    // ── Injection des éléments UI dans le panneau LLM ─────────────────────
    _injectUI() {
        const actionsRow = document.getElementById('llm-actions-row');
        if (!actionsRow) return;

        // Contrôles du mode auto

        const wrapper = document.createElement('div');
        wrapper.style.display = 'none';
        wrapper.id = 'auto-mode-controls';
        wrapper.innerHTML = `
            <div id="auto-mode-row">
                <button id="llm-btn-auto" title="Lancer le mode automatique">▶ Auto</button>
                <button id="llm-btn-stop" title="Arrêter le mode automatique" disabled>⏹ Stop</button>
            </div>
            <div id="auto-delay-row">
                <label for="auto-delay-slider">Délai entre actions :</label>
                <input type="range" id="auto-delay-slider" min="1" max="10" value="3" step="1" />
                <span id="auto-delay-value">3s</span>
            </div>
            <div id="auto-status"></div>
        `;
        actionsRow.after(wrapper);
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
        const btnDesc = document.getElementById('llm-btn-description');
        const btnEtape = document.getElementById('llm-btn-etape');
        const slider  = document.getElementById('auto-delay-slider');

        if (btnAuto)  btnAuto.disabled  = running;
        if (btnStop)  btnStop.disabled  = !running;
        if (btnDesc)  btnDesc.disabled  = running;
        if (btnEtape) btnEtape.disabled = running;
        if (slider)   slider.disabled   = running;
    },

    // ── Démarrage ──────────────────────────────────────────────────────────
    async start() {

        const mode = document.getElementById('llm-mode')?.value;
        if (mode !== 'auto') {
            this._setStatus('⚠️ Passe en mode automatique pour lancer.', 'error');
            return;
        }
        
        const apiKey = document.getElementById('llm-api-key')?.value.trim();
        if (!apiKey) {
            this._setStatus('⚠ Entrez votre clé API OpenRouter.', 'error');
            return;
        }

        // Reset état
        this.conversationHistory = [];
        this.stepCount = 0;
        this._setRunning(true);

        // Vider l'affichage LLM et reset la grille
        const messagesContainer = document.getElementById('llm-messages');
        if (messagesContainer) messagesContainer.innerHTML = '';
        document.getElementById('reset')?.click();

        // Log dans l'historique
        model.globalActions.push({
            type: 'auto-start',
            timestamp: new Date().toLocaleTimeString(),
        });
        historyView.update();

        // Construire le message initial de description
        const target = model.rule?.targetState || Array(9).fill(0);
        const description = model.rule?.description || '';

        const initText = `Grille de 9 boutons (3×3 : 1 2 3 / 4 5 6 / 7 8 9), tous éteints au départ : [□ □ □ □ □ □ □ □ □].
Quand je clique sur un bouton, une règle cachée modifie l'état d'un ou plusieurs boutons.
CLEAR remet tout à [□ □ □ □ □ □ □ □ □] sans compter comme une action.
État cible : [${target.map(v => v ? '■' : '□').join(' ')}].
Description : "${description}".
Je suis en mode automatique : tu joues pour moi. Donne ta première instruction.`;

        this._appendMessage('user', initText);
        this.conversationHistory.push({ role: 'user', content: initText });

        this._setStatus('🤖 Le LLM analyse le problème…', 'running');
        await this._step();
    },

    // ── Boucle principale ──────────────────────────────────────────────────
    async _step() {
        if (!this.running) return;
        if (this.stepCount >= this.MAX_STEPS) {
            this.stop(`Limite de ${this.MAX_STEPS} actions atteinte.`);
            return;
        }

        this.stepCount++;
        const apiKey  = document.getElementById('llm-api-key')?.value.trim();
        const modelId = document.getElementById('llm-model')?.value.trim() || 'openai/gpt-4o-mini';

        const typingId = this._appendMessage('assistant', '…', true);

        try {
            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer':  window.location.href,
                    'X-Title':       'Reasoning Experiment Auto',
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

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || `Erreur ${res.status}`);
            }

            const data  = await res.json();
            const reply = data.choices?.[0]?.message?.content?.trim() || '';

            this._removeMessage(typingId);
            this._appendMessage('assistant', reply);
            this.conversationHistory.push({ role: 'assistant', content: reply });

            // Log réponse LLM dans l'historique global
            model.globalActions.push({
                type: 'llm-auto-reply',
                reply,
                timestamp: new Date().toLocaleTimeString(),
            });
            historyView.update();

            // Parser la réponse
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
                this.stop(`🏳 LLM abandonne : ${parsed.reason}`);
                model.globalActions.push({
                    type: 'llm-abandon',
                    reason: parsed.reason,
                    timestamp: new Date().toLocaleTimeString(),
                });
                historyView.update();
                return;
            }

            if (parsed.type === 'clear') {
                // Effectuer un CLEAR
                document.getElementById('reset')?.click();
                const feedback = 'CLEAR effectué. État : [□ □ □ □ □ □ □ □ □]. Instruction suivante ?';
                this.conversationHistory.push({ role: 'user', content: feedback });
                this._appendMessage('user', feedback);
                this._scheduleNext();
                return;
            }

            if (parsed.type === 'solution') {
                // Jouer toute la séquence
                await this._playSolution(parsed.buttons);
                return;
            }

            if (parsed.type === 'action') {
                await this._clickButton(parsed.button);

                // Vérifier victoire
                if (this._isVictory()) {
                    this._setStatus('🎉 Objectif atteint !', 'success');
                    model.addVictory();
                    historyView.update();
                    document.getElementById('victory-modal')?.classList.remove('hidden');
                    this._setRunning(false);
                    return;
                }

                // Envoyer le résultat au LLM
                const state = model.getState();
                const stateStr = state.map(s => s ? '■' : '□').join(' ');
                const feedback = `Bouton ${parsed.button} cliqué. État actuel : [${stateStr}]. Instruction suivante ?`;
                this.conversationHistory.push({ role: 'user', content: feedback });
                this._appendMessage('user', feedback);

                this._scheduleNext();
            }

        } catch (e) {
            this._removeMessage(typingId);
            this._appendMessage('error', '⚠ Erreur : ' + e.message);
            this.stop('Erreur réseau ou API.');
        }
    },

    _scheduleNext() {
        if (!this.running) return;
        this._setStatus(`⏳ Prochaine action dans ${document.getElementById('auto-delay-slider')?.value || 3}s…`, 'running');
        this._timeoutId = setTimeout(() => this._step(), this._getDelay());
    },

    // ── Jouer une séquence complète ────────────────────────────────────────
    async _playSolution(buttons) {
        this._setStatus(`▶ Exécution de la solution : ${buttons.join(' → ')}`, 'running');

        for (const btn of buttons) {
            if (!this.running) return;
            if (btn < 1 || btn > 9) continue;

            await this._clickButton(btn);

            if (this._isVictory()) {
                this._setStatus('🎉 Objectif atteint !', 'success');
                model.addVictory();
                historyView.update();
                document.getElementById('victory-modal')?.classList.remove('hidden');
                this._setRunning(false);
                return;
            }

            await this._wait(this._getDelay());
        }

        // Séquence jouée mais pas de victoire
        const state = model.getState();
        const stateStr = state.map(s => s ? '■' : '□').join(' ');
        const feedback = `J'ai joué toute la séquence mais l'état est [${stateStr}], pas encore l'objectif. Que faire ?`;
        this.conversationHistory.push({ role: 'user', content: feedback });
        this._appendMessage('user', feedback);
        this._scheduleNext();
    },

    // ── Cliquer un bouton programmatiquement ──────────────────────────────
    async _clickButton(buttonNumber) {
        const index = buttonNumber - 1;
        model.toggle(index);
        view.render(model.getState());
        historyView.update();

        // Log dans l'historique
        model.globalActions.push({
            type: 'llm-auto-action',
            button: buttonNumber,
            timestamp: new Date().toLocaleTimeString(),
        });
        historyView.update();
    },

    // ── Vérification victoire ──────────────────────────────────────────────
    _isVictory() {
        const current = model.getState().map(b => b ? 1 : 0);
        const target  = model.rule?.targetState || Array(9).fill(0);
        return JSON.stringify(current) === JSON.stringify(target);
    },

    // ── Arrêt ──────────────────────────────────────────────────────────────
    stop(reason = 'Arrêté.') {
        this.running = false;
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
        this._setRunning(false);
        this._setStatus(`⏹ ${reason}`, 'stopped');

        model.globalActions.push({
            type: 'auto-stop',
            reason,
            timestamp: new Date().toLocaleTimeString(),
        });
        historyView.update();
    },

    // ── Parser la réponse du LLM ───────────────────────────────────────────
    // Formats attendus :
    //   ACTION: 5
    //   SOLUTION: 3 7 2
    //   CLEAR
    //   ABANDON: la règle est trop complexe
    _parseReply(text) {
        const upper = text.toUpperCase();

        // ABANDON
        const abandonMatch = text.match(/ABANDON\s*[:\-]\s*(.+)/i);
        if (abandonMatch) return { type: 'abandon', reason: abandonMatch[1].trim() };

        // CLEAR
        if (/\bCLEAR\b/.test(upper)) return { type: 'clear' };

        // SOLUTION: N1 N2 N3 ...
        const solMatch = text.match(/SOLUTION\s*[:\-]\s*([\d\s]+)/i);
        if (solMatch) {
            const buttons = solMatch[1].trim().split(/\s+/).map(Number).filter(n => n >= 1 && n <= 9);
            if (buttons.length > 0) return { type: 'solution', buttons };
        }

        // ACTION: N
        const actionMatch = text.match(/ACTION\s*[:\-]\s*(\d)/i);
        if (actionMatch) {
            const button = parseInt(actionMatch[1]);
            if (button >= 1 && button <= 9) return { type: 'action', button };
        }

        // Fallback : cherche un chiffre isolé dans la réponse (tolérance)
        const loose = text.match(/\b([1-9])\b/);
        if (loose) return { type: 'action', button: parseInt(loose[1]) };

        return null;
    },

    // ── System prompt pour le mode auto ───────────────────────────────────
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
Tu peux faire jusqu'à ${this.MAX_STEPS} actions au total.`;
    },

    // ── Utilitaires affichage ──────────────────────────────────────────────
    _appendMessage(role, text, isTyping = false) {
        const container = document.getElementById('llm-messages');
        if (!container) return null;
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

    _removeMessage(id) {
        if (id) document.getElementById(id)?.remove();
    },

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
};