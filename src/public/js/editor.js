// editor.js – Éditeur de règles (page séparée)

let currentRules = { tests: [] };

function addNewRule() {
  const testId = parseInt(document.getElementById('test-id')?.value) || 1;
  const testName = document.getElementById('test-name')?.value.trim() || `Test ${testId}`;

  let test = currentRules.tests.find(t => t.id === testId);
  if (!test) {
    test = { id: testId, name: testName, rules: [] };
    currentRules.tests.push(test);
  }

  const rule = {
    when: { buttonClicked: "*" },
    then: [{ action: "toggle", target: "clicked" }]
  };
  test.rules.push(rule);

  renderRulesList();
}

function renderRulesList() {
  const container = document.getElementById('rules-list');
  if (!container) return;

  container.innerHTML = '';
  currentRules.tests.forEach(test => {
    const div = document.createElement('div');
    div.className = 'rule-block';
    div.innerHTML = `<h4>${test.name} (id ${test.id})</h4>`;

    test.rules.forEach((rule, idx) => {
      div.innerHTML += `
        <div class="rule-row">
          <label>Quand : bouton</label>
          <input type="text" class="when-input" value="${rule.when.buttonClicked}" data-test="${test.id}" data-idx="${idx}">

          <label>Alors :</label>
          <select class="action-select" data-test="${test.id}" data-idx="${idx}">
            <option value="toggle" selected>Toggle</option>
          </select>

          <label>Cible :</label>
          <input type="text" class="target-input" value="${rule.then[0]?.target || ''}" data-test="${test.id}" data-idx="${idx}">

          <button class="remove-btn" data-test="${test.id}" data-idx="${idx}">×</button>
        </div>
      `;
    });

    container.appendChild(div);
  });
}

function generateAndSaveJson() {
  const json = JSON.stringify(currentRules, null, 2);
  const preview = document.getElementById('json-preview');
  if (preview) preview.textContent = json;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rules_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function loadJsonExample() {
  const example = {
    tests: [
      {
        id: 1,
        name: "Toggle simple",
        rules: [
          { when: { buttonClicked: "*" }, then: [{ action: "toggle", target: "clicked" }] }
        ]
      },
      {
        id: 2,
        name: "Effet centre",
        rules: [
          { when: { buttonClicked: "5" }, then: [
            { action: "toggle", target: "clicked" },
            { action: "toggle", target: [1,3,7,9] }
          ]}
        ]
      }
    ]
  };

  currentRules = example;
  renderRulesList();
  document.getElementById('json-preview').textContent = JSON.stringify(example, null, 2);
}

// Attache les événements
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-rule-btn')?.addEventListener('click', addNewRule);
  document.getElementById('generate-json-btn')?.addEventListener('click', generateAndSaveJson);
  document.getElementById('load-example-btn')?.addEventListener('click', loadJsonExample);

  // Optionnel : pré-charger l'exemple au démarrage
  // loadJsonExample();
});