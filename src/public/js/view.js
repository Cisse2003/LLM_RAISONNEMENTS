import { model } from './model.js';

export const view = {
  gridButtons: null,

  init() {
    this.gridButtons = document.querySelectorAll('.grid button');
  },

  render() {
    this.gridButtons.forEach((btn, i) => {
      if (model.buttons[i]) {
        btn.classList.add('on');
      } else {
        btn.classList.remove('on');
      }
    });
  }
};