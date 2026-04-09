//view.js
export const view = {
  gridButtons: null,

  init() {
    this.gridButtons = document.querySelectorAll('.grid button');
  },

  render(buttons) {
    this.gridButtons.forEach((btn, i) => {
      if (buttons[i]) {
        btn.classList.add('on');
      } else {
        btn.classList.remove('on');
      }
    });
  }
};
