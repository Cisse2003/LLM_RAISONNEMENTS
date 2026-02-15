const express = require('express');
const router = express.Router();
const model = require('../model/model');

// Etat actuel
router.get('/state', (req, res) => {
    res.json({
        buttons: model.getState()
    });
});

// Toggle
router.post('/toggle/:id', (req, res) => {
    const id = parseInt(req.params.id);
    model.toggle(id);
    res.json({
        buttons: model.getState()
    });
});

// Reset
router.post('/reset', (req, res) => {
    model.reset();
    res.json({
        buttons: model.getState()
    });
});

router.get('/history', (req, res) => {
    res.json({
        actions: model.getActions()
    });
});

router.get('/current-objective', (req, res) => {
  res.json({
    targetState: model.rule?.targetState || Array(9).fill(0)
  });
});

module.exports = router;
