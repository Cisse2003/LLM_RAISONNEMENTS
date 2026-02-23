import { model } from './model.js';

export const historyView = {
  list: null,

  init() {
    this.list = document.getElementById('actions-list');
  },

  update() {
    const actions = model.getActions();
    if (!actions || actions.length === 0) {
      this.list.innerHTML = '<p>Aucune action pour l’instant</p>';
      return;
    }

    this.list.innerHTML = actions.map((a, idx) => `
      <div>
        <strong>Action ${idx + 1} :</strong> Bouton ${a.button} cliqué à ${a.timestamp}<br>
        État après : ${a.stateAfter.map(s => s ? '■' : '□').join(' ')}
      </div>
    `).join('');
  }
};