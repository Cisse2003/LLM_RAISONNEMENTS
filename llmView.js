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

        modeSelect?.addEventListener('change', () => this.updateModeUI());
        toggleBtn?.addEventListener('click', () => this.toggle());
        btnDescription?.addEventListener('click', () => this.sendDescription());
        btnEtape?.addEventListener('click',       () => this.sendEtape());

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

    // ── Bouton 2 : Étape ────────────────────────────────────────────────────
    sendEtape() {
        // Trouve la dernière action significative (bouton cliqué OU clear)
        const lastAction = [...model.globalActions]
            .reverse()
            .find(a => a.button !== undefined || a.type === 'clear' || a.type === 'load');

        // Récupère la dernière réponse du LLM
        const lastReply = this.conversationHistory.length
            ? this.conversationHistory[this.conversationHistory.length - 1].content
            : '';

        let text;

        // Si le LLM a dit "Terminer"
        if (lastReply.trim().toLowerCase() === 'terminer') {
            if (this.isTargetReached()) {
                text = `🎉 Félicitations ! L'objectif est atteint ! Pouvez-vous maintenant me donner la règle qui cachait les boutons ?`;
            } else {
                text = `⚠️ L'objectif n'est pas encore atteint. Rappelez-vous les règles : \n- Appuyez sur un bouton (1-9) ou RESET\n- Continuez jusqu'à atteindre l'état cible.`;
            }
            this._send(text);
            return;
        }

        // Sinon, on continue normal
        if (!lastAction || (!(lastAction.type === 'clear' || lastAction.type === 'load') && lastAction.button === undefined)) {
            text = `Aucune action effectuée. Quel bouton tester en premier ? (Répondre uniquement par un numéro 1-9, RESET ou "Terminer")`;
        } else if (lastAction.type === 'clear' || lastAction.type === 'load') {
            text = `J'ai utilisé CLEAR : tous les boutons sont maintenant éteints [□ □ □ □ □ □ □ □ □].`;
        } else {
            const avant = lastAction.stateBefore.map(s => s ? '■' : '□').join(' ');
            const apres = lastAction.stateAfter.map(s => s ? '■' : '□').join(' ');
            text = `Bouton ${lastAction.button} cliqué.
            Avant : [${avant}]
            Après : [${apres}]`;

            model.globalActions.push({
                type: 'llm-etape',
                timestamp: new Date().toLocaleTimeString(),
                actionRef: lastAction?.button ?? null,
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
    }
};