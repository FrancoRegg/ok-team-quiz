import { useState } from "react"
import '../styles/Admin.css'

function AdminView() {

    const [ title, setTitle ] = useState("")
    const [ type, setType ] = useState("TEXT")
    const [ options, setOptions ] = useState(["", ""])
    const [ mediaUrl, setMediaUrl ] = useState("")
    const [ correctIndex, setCorrectIndex ] = useState(0)

    const handleOptionChange = (index, value) => {
    let copyOptions = [...options];
    copyOptions[index] = value;
    setOptions(copyOptions);
    }

    const addOption = () => {
        setOptions([...options, ""]);
    }

    const deleteOption = (index) => {
        let copyOptions = [...options];
        copyOptions.splice(index, 1);
        setOptions(copyOptions);
    }

    const handleSubmit = async() => {
        if(!title || options.some(opt => opt.trim() === "")){
            alert("Debes rellenar el titulo y las opciones");
            return;
        }

        let newQuestion = {title: title, type: type, options: options, mediaUrl: mediaUrl, correctIndex: correctIndex}
        
        try{
            const response = await fetch('http://192.168.1.42:3000/api/questions',{
                method: 'POST',
                body: JSON.stringify(newQuestion),
                headers:{
                    'Content-Type': 'application/json'
                }
            
            })
            if(response.ok){
                alert("¡Pregunta guardada con éxito! 🎉")
                setTitle("")
                setType("TEXT")
                setOptions(["", ""])
                setMediaUrl("")
                setCorrectIndex(0)
            }else{
                alert("Hubo un error al guardar en el servidor.")
            }

        }catch(error){
            console.error("Error de red:", error);
            alert("No se pudo conectar con el servidor.");
        }
        
    }

    const handleLogout = () => {
        if(window.confirm("¿Seguro que quieres cerrar sesión?")){
            localStorage.removeItem("admin_token"); // Borra la llave
            window.location.reload(); // Recarga para que el Guard nos eche
        }
    }

    return(
        <div className="admin-container">
            <div className="header-row">
                <h1 className="admin-title" style={{margin: 0}}>Panel Admin</h1>
                <button className="btn-logout" onClick={handleLogout}>
                    Cerrar Sesión 🔒
                </button>
            </div>
            {/* TÍTULO DE LA PREGUNTA */}
            <div className="form-group">
                <label className="form-label">
                    Título de la Pregunta:
                </label>
                <input 
                    className="form-input"
                    type="text" 
                    placeholder="Ej: ¿En qué año se fundó OKTeam?"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                />
            </div>

            {/* ZONA DE OPCIONES */}
            <div className="form-group">
                <label className="form-label">Opciones de Respuesta:</label>
                <div className="options-list">
                    {options.map((opt, i)=>(
                        <div key={i} className="option-row">
                            {/* Radio Button para marcar la correcta */}
                            <input 
                                className="radio-check"
                                type="radio" 
                                name="correctAnswer" 
                                title="Marcar como correcta"
                                checked={correctIndex === i}
                                onChange={() => setCorrectIndex(i)}
                            />
                            
                            {/* Input de texto de la opción */}
                            <input 
                                className="form-input"
                                style={{border: 'none', background: 'transparent'}} // Pequeño ajuste inline para que se integre
                                type="text" 
                                placeholder={`Opción ${i+1}`}
                                value={opt} 
                                onChange={(e) => handleOptionChange(i, e.target.value)}
                            />

                            {/* Botón Borrar */}
                            <button className="btn-delete" onClick={() => deleteOption(i)}>
                                ✕
                            </button>
                        </div>
                    ))}
                    
                    <button className="btn-add" onClick={addOption}>
                        + Agregar otra opción
                    </button>
                </div>
            </div>

            {/* ZONA MULTIMEDIA */}
            <div className="form-group" style={{display: 'flex', gap: '10px'}}>
                <div style={{flex: 1}}>
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
                    <div style={{flex: 2}}>
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

            {/* BOTÓN GUARDAR */}
            <button className="btn-save" onClick={handleSubmit}>
                💾 Guardar Pregunta
            </button>
        </div>
    )
}

export default AdminView;