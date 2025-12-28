import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import QRCode from "react-qr-code";

const socket = io('http://localhost:3000');

function HostView() {
    const [groups, setGroups] = useState([])
    const [gameState, setGameState] = useState("LOBBY")
    const [currentQuestion, setCurrentQuestion] = useState(null)
    const [joinUrl, setJoinUrl] = useState("");

    useEffect(() => {
        setJoinUrl(window.location.origin);

        socket.emit('join_game', {name:'HOST'})
        socket.on('update_players', (data) =>{
            setGroups(data)
        })

        socket.on('game_state', (data)=>{
            setGameState(data)
        })
        socket.on('new_question', (questionData)=>{
            setCurrentQuestion(questionData)
        })
        //Limpieza al cerrado el componente
        return () => {
            socket.off('update_players');
            socket.off('game_state');
            socket.off('new_question')
        }
    }, []);

    if(gameState === 'LOBBY'){
        return(
            <div>
                <h1>Pantalla Proyectada</h1>
                <div style={{textAlign: 'center', fontFamily: 'Arial'}}>
                    <h1>¡Únete al Quiz!</h1>
                
                    {/* ZONA DEL CÓDIGO QR */}
                    <div style={{ background: 'white', padding: '16px', display: 'inline-block', borderRadius: '10px', border: '2px solid #333' }}>
                        {joinUrl && (
                            <QRCode 
                                value={joinUrl} 
                                size={200}
                            />
                        )}
                    </div>
                </div>
                <h3>Escanea o entra en: <span style={{color: 'blue'}}>{joinUrl}</span></h3>
                
                <hr style={{margin: '20px'}}/>

                <h3>Esperando Jugadores...</h3>
                <ul>
                    {groups.filter(grupo => grupo.name !== 'HOST').map((value)=>(
                        <li key={value.id}>{value.name}</li>
                    ))}
                </ul>
                <button 
                    onClick={()=>{socket.emit('start_game')}}>
                        Empezar Juego
                </button>
            </div>
        );
    }

    if(gameState === 'GAME_OVER'){
        const sortedGroups = groups
            .filter(grupo => grupo.name !== 'HOST')
            .sort((a, b) => b.score - a.score);

        const winner = sortedGroups[0];

        return(
            <div>
            <h1>Juego Terminado</h1>
                {winner && (
                    <div>
                        <h2>🏆 GANADOR:</h2>
                        <h1>{winner.name}</h1>
                        <h3>Con {winner.score} puntos</h3>
                    </div>
                )}

                <div>
                     <h3>Tabla Final:</h3>
                     <ul>
                        {sortedGroups.map((p, i) => (
                            <li key={p.id}>{i+1}. {p.name} - {p.score}</li>
                        ))}
                     </ul>
                </div>

                <button onClick={()=>{socket.emit('reset_game')}}>
                    Nueva Partida 🔄
                </button>
            </div>
        )
    }

    return(
        <div>
            <h1>Pantalla Proyectada</h1>
                <div>
                    <h1>{currentQuestion?.title}</h1>
                    {currentQuestion?.mediaUrl && (
                        <div>
                            {currentQuestion.type === 'IMAGE' ? (
                                <img 
                                    src={currentQuestion.mediaUrl} 
                                    alt="Pregunta" 
                                />
                            ) : currentQuestion.type === 'VIDEO' ? (
                                <video 
                                    src={currentQuestion.mediaUrl} 
                                    controls 
                                    autoPlay 
                                />
                            ) : null}
                        </div>
                    )}
                    <div>
                        <ul>
                            {groups
                                .filter(grupo => grupo.name !== 'HOST')
                                .sort((a, b) => b.score - a.score)
                                .map((value, i) => (
                                <li key={value.id}>
                                    {value.name}: {value.score}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <button
                            onClick={()=>{socket.emit('start_game')}}>
                            Siguiente Pregunta
                        </button>
                        <button 
                            onClick={()=>{socket.emit('reset_game')}}>
                            Resetear Juego
                        </button>
                    </div>
                </div>
        </div>
        
    );
};

export default HostView;