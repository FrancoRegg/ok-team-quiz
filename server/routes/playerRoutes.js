const express = require('express');
const router = express.Router();
const {getAllPlayers, updatePlayerScore, cleanSeason} = require('../controllers/player.controller');

router.get('/', getAllPlayers);
router.put('/:id', updatePlayerScore);
router.delete('/clean-season', cleanSeason);

module.exports = router;