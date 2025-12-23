const Question = require('../models/Questions.js')

exports.getQuestion = async(req, res) => {
 try{
    const question = await Question.findAll()
    return res.status(200).json(question);
 }catch(error){
    return res.status(500).json({ message: 'Error al obtener preguntas' });
 }
}

exports.createQuestion = async(req, res) => {
  try{
    const { title, type, options, correctIndex, mediaUrl } = req.body;
    if(!title || !options) {
             return res.status(400).json({ message: 'Faltan datos obligatorios' });
        }
    const newQuestion = await Question.create({ title, type, options, correctIndex, mediaUrl });
    
    return res.status(201).json(newQuestion);
 }catch(error){
    return res.status(500).json({ message: 'Error al crear preguntas' });
 }  
}

exports.deleteQuestion = async(req, res) => {
  try{
    const { id } = req.params
    await Question.destroy({
        where: {
            id: id,
        },
    })
    res.status(204).end()
 }catch(error){
    return res.status(500).json({ message: 'Error al borrar preguntas' });
 }  
}