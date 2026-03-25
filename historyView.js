import { model } from './model.js';

export const historyView = {
  list: null,

  init() {
    this.list = document.getElementById('actions-list');
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
      if (a.type === 'clear') {
        return `
          <div class="action-clear">
            <strong>Action ${idx + 1} :</strong>  CLEAR à ${a.timestamp}
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