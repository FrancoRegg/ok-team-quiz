import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import QRCode from "react-qr-code";
import '../styles/HostView.css'

const socket = io('http://192.168.1.12:3000');

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
            <div className="host-container">
                <h1>Pantalla Proyectada</h1>
                <div>
                    <h1 className="big-title">¡Únete al Quiz!</h1>
                
                    {/* ZONA DEL CÓDIGO QR */}
                    <div className="qr-frame">
                        {joinUrl && (
                            <QRCode 
                                value={joinUrl} 
                                size={200}
                            />
                        )}
                    </div>
                </div>
                <h3 className="sub-title">Escanea o entra en: 
                    <span className="url-highlight">{joinUrl}</span>
                </h3>
                
                <hr/>

                <h3>Esperando Jugadores...</h3>
                <ul className="players-grid">
                    {groups.filter(grupo => grupo.name !== 'HOST').map((value)=>(
                        <li className="player-chip" key={value.id}>{value.name}</li>
                    ))}
                </ul>
                <button 
                    className="btn-primary"
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
            <div className="host-container">
                <h1 className="big-title">Juego Terminado</h1>
                {winner && (
                    <div className="qr-frame">
                        <h2 className="sub-title">🏆 GANADOR:</h2>
                        <h1 className="big-title">{winner.name}</h1>
                        <h3>Con {winner.score} puntos</h3>
                    </div>
                )}

                <div className="ranking-table-container">
                    <h3 className="sub-title" style={{marginTop: '20px'}}>Tabla Final</h3>
                    <ul className="ranking-list" style={{padding: 0, listStyle: 'none', margin: 0}}>
                        {sortedGroups.map((p, i) => (
                            <li key={p.id} className="ranking-row-item">
                                <span className="rank-name">
                                    {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : `${i+1}. `}
                                    {p.name}
                                </span>
                                <span className="rank-score">{p.score} pts</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <button 
                    className="btn-primary" 
                    onClick={()=>{socket.emit('reset_game')}}
                    >
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