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
      return `
        <div>
          <strong>Action ${idx + 1} :</strong> Bouton ${a.button} cliqué à ${a.timestamp}<br>
          État après : ${a.stateAfter.map(s => s ? '■' : '□').join(' ')}
        </div>
      `;
    }).join('');
  }
};