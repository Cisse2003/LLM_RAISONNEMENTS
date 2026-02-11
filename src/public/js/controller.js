import { view } from "./view.js";
import { historyView } from "./historyView.js";

export function setupController() {

  document.querySelectorAll('.grid button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id) - 1;

      const response = await fetch(`/api/toggle/${id}`, {
        method: 'POST'
      });

      const data = await response.json();

      view.render(data.buttons);
      await historyView.update();   // ✅ AJOUTÉ
    });
  });

  document.getElementById('reset').addEventListener('click', async () => {
    const response = await fetch('/api/reset', {
      method: 'POST'
    });

    const data = await response.json();

    view.render(data.buttons);
    await historyView.update();   // ✅ AJOUTÉ
  });

  document.getElementById('rule-select').addEventListener('change', async (e) => {

    const ruleId = e.target.value;

    const response = await fetch(`/api/rule/${ruleId}`, {
      method: 'POST'
    });

    const data = await response.json();

    view.render(data.buttons);
    await historyView.update();
  });

}
