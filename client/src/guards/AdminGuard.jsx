import { useState } from "react";

function AdminGuard({ children }){
    const [ password, setPassword ] = useState("");
    const [ isAuthenticated, setIsAuthenticated ] = useState(() => {
        const saved = localStorage.getItem("admin_token")
        return saved ? true : false;
    });

    const handleLogin = async() => {
        try{
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
                alert("Contraseña incorrecta");
            }
        }catch(error){
            console.error(error);
        }
    }

    return(
        <div>
            {isAuthenticated ? 
                children : 
                <div>
                    <h2>Acceso Administrador</h2>
                    <input name="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button onClick={handleLogin} >Enviar</button>
                </div>}
        </div>
    )
}

export default AdminGuard;