import { useState, useEffect } from "react"
import '../styles/Admin.css'

function AdminView() {

    const [ title, setTitle ] = useState("")
    const [ type, setType ] = useState("TEXT")
    const [ options, setOptions ] = useState(["", ""])
    const [ mediaUrl, setMediaUrl ] = useState("")
    const [ correctIndex, setCorrectIndex ] = useState(0)

    // Estados de gestión
    const [ questionsList, setQuestionsList ] = useState([]) 
    const [ editingId, setEditingId ] = useState(null) 

    const fetchQuestions = async () => {
        try {
            const response = await fetch('http://192.168.1.13:3000/api/questions');
            const data = await response.json();
            setQuestionsList(data);
        } catch (error) {
            console.error("Error al cargar preguntas:", error);
        }
    }

    useEffect(() => {
        fetchQuestions();
    }, []);

    const handleOptionChange = (index, value) => {
        let copyOptions = [...options];
        copyOptions[index] = value;
        setOptions(copyOptions);
    }

    const addOption = () => {
        setOptions([...options, ""]);
    }

    const deleteOption = (index) => {
        if(options.length <= 2) return; 
        let copyOptions = [...options];
        copyOptions.splice(index, 1);
        setOptions(copyOptions);
        
        if (correctIndex >= index && correctIndex > 0) {
            setCorrectIndex(correctIndex - 1);
        }
    }

    const handleEdit = (question) => {
        setEditingId(question.id);
        setTitle(question.title);
        setType(question.type);
        setOptions(Array.isArray(question.options) ? question.options : JSON.parse(question.options));
        setMediaUrl(question.mediaUrl || "");
        setCorrectIndex(question.correctIndex);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const handleDelete = async (id) => {
        if(!window.confirm("¿Estás seguro de borrar esta pregunta?")) return;
        try {
            await fetch(`http://192.168.1.13:3000/api/questions/${id}`, {
                method: 'DELETE'
            });
            fetchQuestions(); 
        } catch (error) {
            alert("Error al borrar");
        }
    }

    const resetForm = () => {
        setEditingId(null);
        setTitle("");
        setType("TEXT");
        setOptions(["", ""]);
        setMediaUrl("");
        setCorrectIndex(0);
    }

    const handleSubmit = async() => {
        if(!title || options.some(opt => opt.trim() === "")){
            alert("Debes rellenar el titulo y las opciones");
            return;
        }

        const questionData = { title, type, options, mediaUrl, correctIndex };
        
        try{
            let url = 'http://192.168.1.13:3000/api/questions';
            let method = 'POST';

            if (editingId) {
                url = `http://192.168.1.13:3000/api/questions/${editingId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                body: JSON.stringify(questionData),
                headers:{ 'Content-Type': 'application/json' }
            });

            if(response.ok){
                alert(editingId ? "¡Pregunta actualizada! ✏️" : "¡Pregunta guardada! 🎉");
                resetForm(); 
                fetchQuestions(); 
            } else {
                alert("Hubo un error en el servidor.");
            }
        } catch(error){
            console.error("Error de red:", error);
            alert("No se pudo conectar con el servidor.");
        }
    }

    const handleLogout = () => {
        if(window.confirm("¿Seguro que quieres cerrar sesión?")){
            localStorage.removeItem("admin_token"); 
            window.location.reload(); 
        }
    }

    return(
        <div className="admin-container">
            <div className="header-row">
                <h1 className="admin-title">
                    {editingId ? "✏️ Editando Pregunta" : "➕ Crear Nueva Pregunta"}
                </h1>
                <button className="btn-logout" onClick={handleLogout}>
                    Cerrar Sesión 🔒
                </button>
            </div>

            {/* --- FORMULARIO --- */}
            <div className="form-group">
                <label className="form-label">Título de la Pregunta:</label>
                <input 
                    className="form-input"
                    type="text" 
                    placeholder="Ej: ¿En qué año se fundó OKTeam?"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                />
            </div>

            <div className="form-group">
                <label className="form-label">Opciones de Respuesta:</label>
                <div className="options-list">
                    {options.map((opt, i)=>(
                        <div key={i} className="option-row">
                            <input 
                                className="radio-check"
                                type="radio" 
                                name="correctAnswer" 
                                title="Marcar como correcta"
                                checked={correctIndex === i}
                                onChange={() => setCorrectIndex(i)}
                            />
                            
                            <input 
                                className="option-input-text"
                                type="text" 
                                placeholder={`Opción ${i+1}`}
                                value={opt} 
                                onChange={(e) => handleOptionChange(i, e.target.value)}
                            />

                            <button className="btn-delete" onClick={() => deleteOption(i)}>✕</button>
                        </div>
                    ))}
                    
                    <button className="btn-add" onClick={addOption}>
                        + Agregar otra opción
                    </button>
                </div>
            </div>

            <div className="form-group form-row-multi">
                <div className="flex-1">
                    <label className="form-label">Tipo:</label>
                    <select 
                        className="form-select"
                        value={type}
                        onChange={(e) => setType(e.target.value)}>
                        <option value="TEXT">Solo Texto</option>
                        <option value="IMAGE">Imagen</option>
                        <option value="VIDEO">Video</option>
                    </select>
                </div>

                {type !== 'TEXT' && (
                    <div className="flex-2">
                        <label className="form-label">Enlace (URL):</label>
                        <input 
                            className="form-input"
                            type="text" 
                            placeholder="http://..."
                            value={mediaUrl} 
                            onChange={(e) => setMediaUrl(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Botonera inferior */}
            <div className="button-group">
                <button 
                    className={`btn-save ${editingId ? 'editing' : ''}`} 
                    onClick={handleSubmit}
                >
                    {editingId ? "💾 Guardar Cambios" : "✨ Crear Pregunta"}
                </button>

                {editingId && (
                    <button className="btn-cancel" onClick={resetForm}>
                        Cancelar
                    </button>
                )}
            </div>

            {/* --- LISTADO DE PREGUNTAS --- */}
            <hr className="divider"/>
            
            <h2 className="questions-title">📚 Preguntas Guardadas ({questionsList.length})</h2>
            
            <div className="questions-list">
                {questionsList.map((q) => (
                    <div key={q.id} className="question-item">
                        <div className="q-info">
                            <strong>{q.title}</strong>
                            <div className="q-meta">
                                {q.type} • {q.options.length} opciones
                            </div>
                        </div>
                        <div className="q-actions">
                            <button className="btn-icon btn-edit" onClick={() => handleEdit(q)}>
                                ✏️
                            </button>
                            <button className="btn-icon btn-delete-item" onClick={() => handleDelete(q.id)}>
                                🗑️
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default AdminView;