import { useState } from "react";
import '../styles/AdminGuard.css'; // <--- No olvides importar el CSS

function AdminGuard({ children }){
    const [ password, setPassword ] = useState("");
    const [ isAuthenticated, setIsAuthenticated ] = useState(() => {
        const saved = localStorage.getItem("admin_token")
        return saved ? true : false;
    });

    const handleLogin = async() => {
        try{
            // OJO: Asegúrate de que esta IP es la correcta (.12 o .42 según tu config)
            const resp = await fetch('http://192.168.1.12:3000/api/login', {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            })
            const data = await resp.json()
            if (data.success){
                localStorage.setItem("admin_token", "true");
                setIsAuthenticated(true);
            }else{
                alert("⛔ Contraseña incorrecta");
                setPassword(""); // Limpiamos el campo si falla
            }
        }catch(error){
            console.error(error);
            alert("Error de conexión con el servidor");
        }
    }

    // Permitir enviar con la tecla ENTER
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    }

    return(
        <div>
            {isAuthenticated ? 
                children : 
                /* VISTA DE LOGIN */
                <div className="guard-container">
                    <div className="login-card">
                        <div className="lock-icon">🔒</div>
                        <h2 className="login-title">Acceso Restringido</h2>
                        
                        <p style={{color: '#666', marginBottom: '20px'}}>
                            Introduce la clave de administrador de OKTeam
                        </p>

                        <input 
                            className="login-input"
                            name="Password" 
                            type="password" 
                            placeholder="Contraseña..."
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown} 
                        />
                        
                        <button className="btn-access" onClick={handleLogin}>
                            Acceder al Panel ➡
                        </button>
                    </div>
                </div>
            }
        </div>
    )
}

export default AdminGuard;