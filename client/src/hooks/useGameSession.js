import { useEffect } from 'react';

// Validación y sincronización de sesión

export const useGameSession = (socket, setInside, setNameGroup) => {
    
    useEffect(() => {
        if (!socket) return;

        const handleServerCheck = (data) => {
            const { serverId, gameId } = data;
        
            console.log("🔔 server_check recibido:", { serverId, gameId });
            
            const incomingServerId = String(serverId);
            const incomingGameId = String(gameId);
            
            const storedServerId = localStorage.getItem("server_run_id");
            const storedGameId = localStorage.getItem("game_session_id");
            const storedName = localStorage.getItem("savedGroupName");

            // Primera vez que se conecta
            if (!storedServerId || !storedGameId) {
                console.log("📝 Primera conexión, guardando IDs...");
                localStorage.setItem("server_run_id", incomingServerId);
                localStorage.setItem("game_session_id", incomingGameId);
                return;
            }

            // El servidor se reinició
            if (storedServerId !== incomingServerId) {
                console.log("🔄 Servidor reiniciado, actualizando IDs...");
                localStorage.setItem("server_run_id", incomingServerId);
                localStorage.setItem("game_session_id", incomingGameId);
                
                if (storedName) {
                    console.log("🧹 Limpiando nombre guardado (servidor reiniciado)");
                    localStorage.removeItem("savedGroupName");
                    setInside(false);
                    setNameGroup("");
                    alert("El servidor se reinició. Por favor, vuelve a unirte.");
                }
                return;
            }

            // La partida se reseteó
            if (storedGameId !== incomingGameId) {
                console.log("🎮 Partida reseteada (gameId cambió)");
                console.log("   - Guardado:", storedGameId);
                console.log("   - Recibido:", incomingGameId);
                
                localStorage.setItem("game_session_id", incomingGameId);
                
                if (storedName) {
                    console.log("🧹 Limpiando nombre guardado (partida reseteada)");
                    localStorage.removeItem("savedGroupName");
                    setInside(false);
                    setNameGroup("");
                    alert("La partida se reinició. Por favor, vuelve a unirte.");
                }
                return;
            }

            // Reconexión normal
            if (storedName) {
                console.log("🔄 Reconectando con gameId guardado:", storedGameId);
                socket.emit('join_game', { 
                    name: storedName,
                    gameId: storedGameId
                });
                setInside(true);
            }
        };

        const handleSessionExpired = (data) => {
            console.log('⛔ Sesión expirada:', data.message);
            
            if (data.currentGameId) {
                localStorage.setItem("game_session_id", String(data.currentGameId));
            }
            
            localStorage.removeItem("savedGroupName");
            
            setInside(false);
            setNameGroup("");
            
            alert(data.message || 'La partida se reinició. Debes volver a unirte.');
        };

        const handleForceRefresh = () => {
            localStorage.removeItem("savedGroupName");
            setInside(false);
            setNameGroup("");
            window.location.reload();
        };

        socket.on('server_check', handleServerCheck);
        socket.on('session_expired', handleSessionExpired);
        socket.on('force_refresh', handleForceRefresh);

        return () => {
            socket.off('server_check', handleServerCheck);
            socket.off('session_expired', handleSessionExpired);
            socket.off('force_refresh', handleForceRefresh);
        };
    }, [socket, setInside, setNameGroup]);
}