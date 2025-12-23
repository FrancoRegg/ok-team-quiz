const express = require('express')
const router = express.Router();
const { getQuestion, createQuestion, deleteQuestion } = require('../controllers/question.controller')

router.get('/', getQuestion);
router.post('/', createQuestion);
router.delete('/:id', deleteQuestion);

module.exports = router;