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

    // --- LÓGICA DE RECUPERACIÓN ---
    const handleForgotPassword = () => {
        alert(
            "🔐 RECUPERACIÓN DE CONTRASEÑA\n\n" +
            "Como esta es una aplicación local segura, la contraseña no se envía por email.\n\n" +
            "PARA VER TU CONTRASEÑA:\n" +
            "1. Ve a la carpeta del proyecto en tu PC Servidor.\n" +
            "2. Abre el archivo llamado '.env' con el bloc de notas.\n" +
            "3. Busca donde dice ADMIN_PASSWORD.\n\n" +
            "También puedes verla en la pantalla negra (consola) al iniciar el servidor."
        );
    }

    // Si está autenticado, mostramos el Panel. Si no, el Login.
    if (isAuthenticated) {
        return children;
    }

    return(
        <div className="guard-container">
            <div className="login-card">
                <div className="lock-icon">🔒</div>
                
                <h2 className="login-title">Acceso Restringido</h2>
                <p className="login-subtitle">Panel de Control OK TEAM</p>

                <input 
                    className="login-input"
                    name="Password" 
                    type="password" 
                    placeholder="Escribe la contraseña..."
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown} 
                />
                
                <button className="btn-access" onClick={handleLogin}>
                    Acceder al Panel ➡
                </button>

                {/* Enlace de recuperación */}
                <div className="forgot-section">
                    <button className="btn-forgot" onClick={handleForgotPassword}>
                        ¿Olvidaste la contraseña?
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AdminGuard;