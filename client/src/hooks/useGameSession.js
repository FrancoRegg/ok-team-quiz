import { useEffect, useRef } from 'react';

// Validación y sincronización de sesión

export const useGameSession = (socket, setInside, setNameGroup) => {
    
    const serverCheckReceivedRef = useRef(false);
    
    useEffect(() => {
        if (!socket) return;

        const handleServerCheck = (data) => {
            serverCheckReceivedRef.current = true;
            
            const { serverId, gameId, gameState } = data;

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

            // El servidor se reinició (serverId cambió)
            if (storedServerId !== incomingServerId) {
                console.log("🔄 Servidor reiniciado (serverId cambió)");
                localStorage.setItem("server_run_id", incomingServerId);
                localStorage.setItem("game_session_id", incomingGameId);
                
                console.log("🧹 Limpiando localStorage (servidor nuevo)");
                localStorage.removeItem("savedGroupName");
                setInside(false);
                setNameGroup("");
                
                if (storedName) {
                    alert("El servidor se reinició. Por favor, vuelve a unirte.");
                }
                return;
            }

            // La partida se reseteó (gameId cambió)
            if (storedGameId !== incomingGameId) {
                console.log("🎮 GameId cambió", { guardado: storedGameId, recibido: incomingGameId });
                
                localStorage.setItem("game_session_id", incomingGameId);
                
                if (storedName) {
                    console.log("✅ Intentando reconectar con gameId actualizado...");
                    setNameGroup(storedName);
                    
                    socket.emit('join_game', { 
                        name: storedName,
                        gameId: incomingGameId
                    });
                    
                    setInside(true);
                }
                return;
            }

            // IDs coinciden
            if (storedName) {
                if (gameState === 'GAME_OVER') {
                    console.log("🏁 Partida terminada. Limpiando sesión...");
                    localStorage.removeItem("savedGroupName");
                    setInside(false);
                    setNameGroup("");
                    alert("La partida terminó. Espera al próximo juego o únete con un nuevo nombre.");
                    return;
                }

                console.log("✅ Sesión válida. Reconectando", { nombre: storedName });
                setNameGroup(storedName);
                
                socket.emit('join_game', { 
                    name: storedName,
                    gameId: incomingGameId
                });
                
                setInside(true);
            } else {
                console.log("ℹ️ No hay nombre guardado. Mostrar login.");
                setInside(false);
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
        
        const checkServerCheckReceived = setTimeout(() => {
            if (!serverCheckReceivedRef.current && socket.connected) {
                console.log('⚠️ server_check no recibido después de 2s, pidiendo manualmente...');
                socket.emit('request_server_check');  // Pedirlo al servidor
            }
        }, 2000);  // Esperar 2 segundos

        socket.on('server_check', handleServerCheck);
        socket.on('session_expired', handleSessionExpired);
        socket.on('force_refresh', handleForceRefresh);

        return () => {
            clearTimeout(checkServerCheckReceived);
            socket.off('server_check', handleServerCheck);
            socket.off('session_expired', handleSessionExpired);
            socket.off('force_refresh', handleForceRefresh);
        };
    }, [socket, setInside, setNameGroup]);
}