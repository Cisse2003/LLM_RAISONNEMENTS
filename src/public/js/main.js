import { view } from './view.js';
import { historyView } from './historyView.js';
import { setupController } from './controller.js';

view.init();
historyView.init();      // ✅ Initialisation de l'historique
setupController();

// Charger état initial des boutons
fetch('/api/state')
    .then(res => res.json())
    .then(data => {
        view.render(data.buttons);
    });

// Charger état initial de l'historique
historyView.update();    // ✅ Affiche l'historique au chargement
