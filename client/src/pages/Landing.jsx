import { Navigate } from "react-router-dom";

// Entrada por la URL raíz: el celular va a la vista del jugador y cualquier
// otro dispositivo (la PC del proyector) a la del Host
function Landing(){
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return <Navigate to={isMobile ? '/play' : '/host'} />;
}

export default Landing;
