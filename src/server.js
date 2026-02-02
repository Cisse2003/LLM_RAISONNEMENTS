const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static("public"));


app.get('/api/reset', (req, res) => {
  res.json({ message: 'Reset OK' });
});

app.get('/', (req, res) => {
   res.sendFile(__dirname + "/public/html/index.html");
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});