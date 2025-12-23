import { useState } from "react"

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

    return(
        <div>
            <h1>Panel de Administracion</h1>
            <div>
                <label>
                    Añade una pregunta:
                    <input 
                        type="text" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} />
                </label>
            </div>
            {options.map((opt, i)=>(
                <div key={i}>
                    <input 
                        type="text" 
                        value={opt} 
                        onChange={(e) => handleOptionChange(i, e.target.value)}/>
                    
                    <input 
                        type="radio" 
                        name="correctAnswer" 
                        checked={correctIndex === i}
                        onChange={() => setCorrectIndex(i)}/>
                    <button onClick={() => deleteOption(i)}>Borrar opcion</button>
                </div>
            ))}
            <button onClick={addOption}>
                Agrega otra opcion
            </button>
            <div>
                <label>
                    Tipo de dato: 
                    <select 
                        defaultValue={"TEXT"}
                        value={type}
                        onChange={(e) => setType(e.target.value)}>
                            <option value="TEXT">Texto</option>
                            <option value="IMAGE">Imagen</option>
                            <option value="VIDEO">Video</option>
                    </select>
                </label>
                    {type !== 'TEXT' && (
                        <label>
                            Enlace de archivo ({type}):
                            <input 
                                type="text" 
                                value={mediaUrl} 
                                onChange={(e) => setMediaUrl(e.target.value)}/>
                        </label>
                    )}
            </div>
        </div>
    )
}

export default AdminView;