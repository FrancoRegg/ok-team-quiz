const Question = require('../models/Questions.js')

// Funciones de validacion./ 

// Sanitiza un string eliminando caracteres peligrosos
function sanitizeString(str) {
    if (typeof str !== 'string') return '';
    
    // Eliminar scripts y tags HTML peligrosos.
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*>/gi, '')
        .trim();
}

// Valida que URL sea valida.
function isValidUrl(string) {
    if (!string) return false;
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Valida los datos de una pregunta.
function validateQuestionData(data) {
    const errors = [];
    
    // Validar title
    if (!data.title || typeof data.title !== 'string') {
        errors.push('El título es obligatorio');
    } else {
        const sanitizedTitle = sanitizeString(data.title);
        
        if (sanitizedTitle.length < 5) {
            errors.push('El título debe tener al menos 5 caracteres');
        }
        
        if (sanitizedTitle.length > 500) {
            errors.push('El título no puede superar 500 caracteres');
        }
        
        // Actualizar con versión sanitizada
        data.title = sanitizedTitle;
    }
    
    // Validar type
    const validTypes = ['TEXT', 'IMAGE', 'VIDEO'];
    if (!data.type) {
        data.type = 'TEXT'; // Default
    } else if (!validTypes.includes(data.type)) {
        errors.push('El tipo debe ser TEXT, IMAGE o VIDEO');
    }
    
    // Validar options
    if (!data.options) {
        errors.push('Las opciones son obligatorias');
    } else if (!Array.isArray(data.options)) {
        errors.push('Las opciones deben ser un array');
    } else {
        // Validar cantidad
        if (data.options.length < 2) {
            errors.push('Debe haber al menos 2 opciones');
        }
        
        if (data.options.length > 6) {
            errors.push('No puede haber más de 6 opciones');
        }
        
        // Validar cada opción
        const sanitizedOptions = [];
        data.options.forEach((opt, index) => {
            if (typeof opt !== 'string') {
                errors.push(`La opción ${index + 1} debe ser texto`);
            } else {
                const sanitized = sanitizeString(opt);
                
                if (!sanitized || sanitized.trim() === '') {
                    errors.push(`La opción ${index + 1} no puede estar vacía`);
                }
                
                if (sanitized.length > 200) {
                    errors.push(`La opción ${index + 1} no puede superar 200 caracteres`);
                }
                
                sanitizedOptions.push(sanitized);
            }
        });
        
        // Actualizar con versión sanitizada
        data.options = sanitizedOptions;
    }
    
    // Validar CorrectIndex
    if (data.correctIndex === undefined || data.correctIndex === null) {
        errors.push('Debe indicar cuál es la respuesta correcta');
    } else {
        const idx = parseInt(data.correctIndex);
        
        if (isNaN(idx)) {
            errors.push('El índice de respuesta correcta debe ser un número');
        } else if (idx < 0) {
            errors.push('El índice de respuesta correcta no puede ser negativo');
        } else if (data.options && idx >= data.options.length) {
            errors.push(`El índice de respuesta correcta (${idx}) está fuera de rango. Hay ${data.options.length} opciones.`);
        }
        
        data.correctIndex = idx;
    }
    
    // Validar MediaURL
    if (data.type === 'IMAGE' || data.type === 'VIDEO') {
        if (!data.mediaUrl) {
            errors.push(`Debe proporcionar una URL para el tipo ${data.type}`);
        } else if (!isValidUrl(data.mediaUrl)) {
            errors.push('La URL del archivo multimedia no es válida');
        }
    } else {
        // Si es TEXT, limpiar mediaUrl
        data.mediaUrl = null;
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors,
        data: data
    };
}

exports.getQuestion = async(req, res) => {
 try{
    // Mismo orden que en la partida: el panel y el proyector tienen que
    // mostrar las preguntas en la misma secuencia (ver gameLogics)
    const question = await Question.findAll({ order: [['createdAt', 'ASC']] })
    return res.status(200).json(question);
 }catch(error){
    return res.status(500).json({ message: 'Error al obtener preguntas' });
 }
}

exports.createQuestion = async(req, res) => {
   try{
      const validation = validateQuestionData(req.body);
      
      if(!validation.isValid){
         return res.status(400).json({
            message: 'Datos invalidos',
            errors: validation.errors
         });
      }

      const newQuestion = await Question.create(validation.data);
      return res.status(201).json(newQuestion)
      
   }catch(error){
      console.error('Error al crear pregunta:', error)
      return res.status(500).json({ message: 'Error al crear preguntas' });
   }  
}

exports.updateQuestion = async(req, res) => {
   try{
      const { id } = req.params;

      const question = await Question.findByPk(id);
      if (!question) {
         return res.status(404).json({ error: 'Pregunta no encontrada' });
      }

      const validation = validateQuestionData(req.body);

      if(!validation.isValid) {
         return res.status(400).json({
            message: 'Datos invalidos',
            errors: validation.errors
         });
      }

      await question.update(validation.data);

      res.status(200).json(question);

   } catch (error){
      console.error('Error al actualizar pregunta:', error);
      return res.status(500).json({ message: 'Error al actualizar pregunta' });
   }  
}

exports.deleteQuestion = async(req, res) => {
  try{
      const { id } = req.params

      if(!id){
         return res.status(400).json({
            message: 'ID no proporcionado.'
         })
      }

      const question = await Question.findByPk(id);

      if(!question){
         return res.status(404).json({
            message: 'Pregunta no encontrada.'
         })
      }

      await question.destroy();

      res.status(204).end();
   }catch(error){
      console.error('Error al borrar pregunta:', error)
      return res.status(500).json({ message: 'Error al borrar pregunta' });
   }  
}