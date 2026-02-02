const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get('/editor.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'editor.html'));
});

app.get('/api/reset', (req, res) => {
  res.json({ message: 'Reset OK' });
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});