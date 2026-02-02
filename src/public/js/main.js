import { model } from './model.js';
import { view } from './view.js';
import { historyView } from './historyView.js';
import { setupController } from './controller.js';

// Initialisation
view.init();
historyView.init();
model.initRule();
setupController();

// Premier rendu
view.render();
historyView.update();