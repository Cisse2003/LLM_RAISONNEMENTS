const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const gameRoutes = require('./api/routes');
const { Rule } = require('./model/rules.js');
const model = require('./model/model.js');
const {readdirSync} = require("node:fs");

app.use(express.json());
app.use(express.static("public"));

app.use('/api', gameRoutes);



app.post('/api/rule/:id', (req, res) => {
    const ruleId = parseInt(req.params.id);

    try {
        model.currentTest = ruleId;
        model.rule = new Rule(ruleId);
        model.reset();

        res.json({
            message: "Règle changée",
            buttons: model.getState()
        });
    } catch (error) {
        res.status(400).json({ error: "Règle inexistante" });
    }
});

app.get('/api/rules', (req, res) => {
    const rulesDir = path.join(__dirname, 'ressources','rules'); // chemin vers les JSON
    let rulesList = [];

    try {
        const files = readdirSync(rulesDir);
        // On garde seulement les fichiers regleX.json et on trie par numéro
        rulesList = files
            .filter(f => f.match(/^regle\d+\.json$/))
            .map(f => parseInt(f.match(/^regle(\d+)\.json$/)[1]))
            .sort((a, b) => a - b);

        res.json({ rules: rulesList });
    } catch (err) {
        res.status(500).json({ error: 'Impossible de lire les règles' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public/html/index.html"));
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
