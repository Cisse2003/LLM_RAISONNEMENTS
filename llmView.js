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

        toggleBtn?.addEventListener('click', () => this.toggle());
        btnDescription?.addEventListener('click', () => this.sendDescription());
        btnEtape?.addEventListener('click',       () => this.sendEtape());
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