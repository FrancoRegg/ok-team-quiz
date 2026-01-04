const express = require('express')
const router = express.Router();
const { getQuestion, createQuestion, updateQuestion, deleteQuestion } = require('../controllers/question.controller')

router.get('/', getQuestion);
router.post('/', createQuestion);
router.delete('/:id', deleteQuestion);
router.put('/:id', updateQuestion);

module.exports = router;