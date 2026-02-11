const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

const gameRoutes = require('./api/routes');

app.use(express.json());
app.use(express.static("public"));

app.use('/api', gameRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public/html/index.html"));
});

app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
