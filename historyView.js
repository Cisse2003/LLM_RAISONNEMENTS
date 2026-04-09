//historyView.js
import { model } from './model.js';
import { llmView } from './llmView.js';

export const historyView = {
  list: null,

  init() {
    this.list = document.getElementById('actions-list');
    llmView.init();
  },

  updateClear() {
    this.list.innerHTML = `
      <div>
        <strong>Action CLEAR :</strong> 
      </div>
    `
  },

  update() {

    const actions = model.globalActions;
    if (!actions || actions.length === 0) {
      this.list.innerHTML = '<p>Aucune action pour l\'instant</p>';
      return;
    }

    this.list.innerHTML = actions.map((a, idx) => {
      console.log(a.type)
      if (a.type === 'load') {
        return `
          <div class="action-load">
            <strong>📂 ${a.testLabel}</strong> — chargé à ${a.timestamp}
          </div>
        `;
      }
      if (a.type === 'victory') {
        return `
          <div class="action-victory">
             <strong>Objectif atteint !</strong> à ${a.timestamp}
          </div>
        `;
      }
      if (a.type === 'validation-success') {
        return `
        <div class="action-validation-success">
          <strong>Validation réussie !</strong> à ${a.timestamp}
        </div>
      `;
      }
      if (a.type === 'clear') {
        return `
          <div class="action-clear">
            <strong>Action ${idx + 1} :</strong>  CLEAR à ${a.timestamp}
          </div>
        `;
      }
      if (a.type === 'validation-question') {
          return `
      <div class="action-validation-question">
        <strong>Phase de validation — Question ${a.questionIndex}</strong> :
        ${a.status} à ${a.timestamp}
      </div>
    `;
      }

        if (a.type === 'validation-failure') {
          return `
      <div class="action-validation-failure">
        <strong>Validation échouée</strong> à ${a.timestamp}
      </div>
    `;
      }
      if (a.type === 'validation-abandon') {
        return `
        <div class="action-validation-abandon">
            <strong>Validation abandonnée</strong> à ${a.timestamp}
        </div>
    `;
      }
      if (a.type === 'llm-description') {
        return `
      <div class="action-llm">
        <strong>Envoi Description LLM</strong> à ${a.timestamp}
      </div>
    `;
      }
      if (a.type === 'llm-etape') {
        const ref = a.actionRef ? ` (bouton ${a.actionRef})` : '';
        return `
      <div class="action-llm">
        <strong>Envoi Étape LLM</strong>${ref} à ${a.timestamp}
      </div>
    `;
      }
          if (a.type === 'comment') {
            return `
        <div class="action-comment">
          <strong>Commentaire :</strong> ${a.text} à ${a.timestamp}
        </div>
      `;
      }
       if (a.type === 'auto-start') {
        return `
          <div class="action-auto-start">
            <strong>🤖 Mode automatique démarré</strong> à ${a.timestamp}
          </div>
        `;
      }
      if (a.type === 'auto-stop') {
        return `
          <div class="action-auto-stop">
            <strong>⏹ Mode auto arrêté</strong> — ${a.reason} à ${a.timestamp}
          </div>
        `;
      }
      if (a.type === 'llm-auto-reply') {
        return `
          <div class="action-llm">
            <strong>🤖 Réponse LLM :</strong> ${a.reply} à ${a.timestamp}
          </div>
        `;
      }
      if (a.type === 'llm-auto-action') {
        return `
          <div class="action-llm-auto">
            <strong>🤖 LLM clique bouton ${a.button}</strong> à ${a.timestamp}
          </div>
        `;
      }
      if (a.type === 'llm-abandon') {
        return `
          <div class="action-llm-abandon">
            <strong>🏳 LLM abandonne :</strong> ${a.reason} à ${a.timestamp}
          </div>
        `;
      }
      return `
        <div>
          <strong>Action ${idx + 1} :</strong> Bouton ${a.button} cliqué à ${a.timestamp}<br>
          État après : ${a.stateAfter.map(s => s ? '■' : '□').join(' ')}
        </div>
      `;
    }).join('');
  }

};